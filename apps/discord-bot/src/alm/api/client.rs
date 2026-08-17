use std::{fmt::Debug, sync::OnceLock, time::Duration};

use poise::serenity_prelude::UserId;
use reqwest::{Client as ReqwestClient, Method, RequestBuilder};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::config::ApiClientConfig;

const TOKEN_PATH: &str = "/var/run/secrets/kubernetes.io/serviceaccount/token";
type Error = Box<dyn std::error::Error + Send + Sync>;

trait AuthExt {
    async fn with_k8s_auth(self) -> Result<RequestBuilder, Error>;
}

impl AuthExt for RequestBuilder {
    async fn with_k8s_auth(self) -> Result<RequestBuilder, Error> {
        let token = tokio::fs::read_to_string(TOKEN_PATH).await?;
        Ok(self.bearer_auth(token.trim()))
    }
}

struct Requester {
    base_path: String,
    requires_jwt: bool,
    reqwest_client: ReqwestClient,
}

impl Requester {
    fn new(config: ApiClientConfig) -> Result<Self, Error> {
        Ok(Self {
            base_path: format!("http://{}/api", config.host),
            requires_jwt: config.requires_jwt,
            reqwest_client: ReqwestClient::builder()
                .timeout(Duration::from_secs(20))
                .build()?,
        })
    }

    async fn request(&self, method: Method, path: &str) -> Result<RequestBuilder, Error> {
        let url = format!("{}/{}", self.base_path, path);
        let builder = self.reqwest_client.request(method, url);

        if self.requires_jwt {
            builder.with_k8s_auth().await
        } else {
            Ok(builder)
        }
    }
}

static REQUESTER: OnceLock<Requester> = OnceLock::new();

fn requester() -> Result<&'static Requester, Error> {
    REQUESTER
        .get()
        .ok_or_else(|| std::io::Error::other("internal API client was not initialized").into())
}

pub struct Client {}
impl Client {
    pub fn initialize(config: ApiClientConfig) -> Result<(), Error> {
        let requester = Requester::new(config)?;
        REQUESTER.set(requester).map_err(|_| {
            std::io::Error::other("internal API client was initialized more than once").into()
        })
    }
    pub async fn maps(region: Option<&str>, is_shared: Option<bool>) -> Result<Vec<Map>, Error> {
        let response = requester()?
            .request(Method::GET, "maps")
            .await?
            .query(&MapsQuery { region, is_shared })
            .send()
            .await?
            .error_for_status()?;

        Ok(response.json().await?)
    }

    pub async fn create_challenge(request: &ChallengeRequest<'_>) -> Result<String, Error> {
        let response = requester()?
            .request(Method::POST, "internal/discord-bot/challenges")
            .await?
            .json(request)
            .send()
            .await?
            .error_for_status()?
            .json::<ChallengeResponse>()
            .await?;

        if !response
            .url
            .starts_with("https://www.geoguessr.com/challenge/")
        {
            return Err(std::io::Error::other("ALM API returned an invalid challenge URL").into());
        }

        Ok(response.url)
    }

    pub async fn publish_map(
        geoguessr_map_id: &String,
        discord_thread_author_id: UserId,
    ) -> Result<(), PublishMapError> {
        let payload = PublishMapPayload {
            discord_thread_author_id: discord_thread_author_id.to_string(),
        };

        let path = format!("internal/discord-bot/maps/{geoguessr_map_id}/publish");
        let response = requester()?
            .request(Method::POST, &path)
            .await?
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            reqwest::StatusCode::OK => Ok(()),
            reqwest::StatusCode::NOT_FOUND => Err(PublishMapError::MapNotFound),
            reqwest::StatusCode::BAD_REQUEST => {
                let error_response: PublishMapErrorResponse = response.json().await?;
                Err(PublishMapError::ValidationError(error_response.errors))
            }
            reqwest::StatusCode::FORBIDDEN => Err(PublishMapError::ValidationError(vec![
              "\
                Map doesn't belong to the user that started the thread.\
                This is protection against people requesting to publish maps that don't belong to them
              ".to_string()
            ])),
            status => {
                error!(
                    r#"
                      publish_map: unexpected status {}
                      {}
                    "#,
                    status,
                    response.text().await?
                );
                Err(PublishMapError::Unknown(
                    format!("Unexpected status: {status}"),
                    None,
                ))
            }
        }
    }

    /// Returns whether a Discord user is verified by the internal API.
    ///
    /// Any transport, HTTP, or decode failure surfaces as an error so the
    /// caller can treat it as indeterminate rather than verified.
    pub async fn is_discord_verified(user_id: u64) -> Result<bool, Error> {
        let path = format!("internal/discord-bot/users/{user_id}/is-discord-verified");
        let response = requester()?
            .request(Method::GET, &path)
            .await?
            .send()
            .await?
            .error_for_status()?;
        let body: IsDiscordVerifiedResponse = response.json().await?;
        Ok(body.is_discord_verified)
    }

    /// Records one accepted message for a Discord user and returns the new
    /// verification state. The endpoint is not message-id idempotent: callers
    /// are responsible for deduplicating per create event within this process.
    pub async fn record_verified_message(user_id: u64) -> Result<MessageVerification, Error> {
        let path = format!("internal/discord-bot/users/{user_id}/verified-message");
        let response = requester()?
            .request(Method::POST, &path)
            .await?
            .send()
            .await?
            .error_for_status()?;
        Ok(response.json().await?)
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Map {
    #[serde(rename = "geoguessrId")]
    pub geoguessr_id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
struct MapsQuery<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    region: Option<&'a str>,
    #[serde(rename = "isShared", skip_serializing_if = "Option::is_none")]
    is_shared: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct IsDiscordVerifiedResponse {
    #[serde(rename = "isDiscordVerified")]
    is_discord_verified: bool,
}

#[derive(Debug, Deserialize, Eq, PartialEq)]
pub struct MessageVerification {
    #[serde(rename = "isDiscordVerified")]
    pub is_discord_verified: bool,
    #[serde(rename = "discordVerifiedMessages")]
    pub discord_verified_messages: i64,
}

#[derive(Debug, Serialize)]
pub struct ChallengeRequest<'a> {
    pub geoguessr_map_id: &'a str,
    pub time_limit: u32,
    pub forbid_moving: bool,
    pub forbid_rotating: bool,
    pub forbid_zooming: bool,
}

#[derive(Debug, Deserialize)]
struct ChallengeResponse {
    url: String,
}

#[derive(Serialize, Debug)]
struct PublishMapPayload {
    discord_thread_author_id: String,
}

#[derive(Deserialize, Debug)]
struct PublishMapErrorResponse {
    errors: Vec<String>,
}

#[derive(Debug)]
pub enum PublishMapError {
    MapNotFound,
    ValidationError(Vec<String>),
    Unknown(String, Option<reqwest::Error>),
    AuthError(String),
}

impl From<reqwest::Error> for PublishMapError {
    fn from(error: reqwest::Error) -> Self {
        PublishMapError::Unknown(error.to_string(), Some(error))
    }
}

impl From<Box<dyn std::error::Error + Send + Sync>> for PublishMapError {
    fn from(error: Box<dyn std::error::Error + Send + Sync>) -> Self {
        PublishMapError::AuthError(error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::MessageVerification;

    #[test]
    fn parses_verified_message_response() {
        let body: MessageVerification =
            serde_json::from_str(r#"{"isDiscordVerified":true,"discordVerifiedMessages":5}"#)
                .expect("response must deserialize");
        assert!(body.is_discord_verified);
        assert_eq!(body.discord_verified_messages, 5);
    }

    #[test]
    fn parses_unverified_message_response() {
        let body: MessageVerification =
            serde_json::from_str(r#"{"isDiscordVerified":false,"discordVerifiedMessages":2}"#)
                .expect("response must deserialize");
        assert!(!body.is_discord_verified);
        assert_eq!(body.discord_verified_messages, 2);
    }
}
