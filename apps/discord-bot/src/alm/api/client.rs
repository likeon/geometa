use std::{fmt::Debug, sync::LazyLock, time::Duration};

use poise::serenity_prelude::UserId;
use reqwest::{Client as ReqwestClient, Method, RequestBuilder};
use serde::{Deserialize, Serialize};
use tracing::error;

const TOKEN_PATH: &str = "/var/run/secrets/kubernetes.io/serviceaccount/token";
const ENV_API_DISABLE_K8S_AUTH: &str = "API_DISABLE_K8S_AUTH";
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
    fn new() -> Self {
        let disable_k8s_auth = match std::env::var(ENV_API_DISABLE_K8S_AUTH) {
            Ok(value) => value
                .parse::<bool>()
                .unwrap_or_else(|_| panic!("{ENV_API_DISABLE_K8S_AUTH} must be true or false")),
            Err(std::env::VarError::NotPresent) => false,
            Err(std::env::VarError::NotUnicode(_)) => {
                panic!("{ENV_API_DISABLE_K8S_AUTH} must be valid UTF-8")
            }
        };
        let (api_host, requires_jwt) =
            api_host_and_auth(std::env::var("API_HOST").ok(), disable_k8s_auth);
        Requester {
            base_path: format!("http://{api_host}/api"),
            requires_jwt,
            reqwest_client: ReqwestClient::builder()
                .timeout(Duration::from_secs(20))
                .build()
                .expect("failed to create HTTP client"),
        }
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

fn api_host_and_auth(configured_host: Option<String>, disable_k8s_auth: bool) -> (String, bool) {
    match configured_host {
        Some(host) => (host, !disable_k8s_auth),
        None => ("localhost:3000".to_string(), false),
    }
}

static REQUESTER: LazyLock<Requester> = LazyLock::new(Requester::new);
pub struct Client {}
impl Client {
    pub async fn maps(region: Option<&str>, is_shared: Option<bool>) -> Result<Vec<Map>, Error> {
        let response = REQUESTER
            .request(Method::GET, "maps")
            .await?
            .query(&MapsQuery { region, is_shared })
            .send()
            .await?
            .error_for_status()?;

        Ok(response.json().await?)
    }

    pub async fn create_challenge(request: &ChallengeRequest<'_>) -> Result<String, Error> {
        let response = REQUESTER
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
        let response = REQUESTER
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
        let response = REQUESTER
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
        let response = REQUESTER
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
    use super::{MessageVerification, api_host_and_auth};

    #[test]
    fn configured_api_host_requires_kubernetes_auth_by_default() {
        assert_eq!(
            api_host_and_auth(Some("api:3000".to_string()), false),
            ("api:3000".to_string(), true)
        );
    }

    #[test]
    fn explicit_flag_disables_kubernetes_auth() {
        assert_eq!(
            api_host_and_auth(Some("localhost:3000".to_string()), true),
            ("localhost:3000".to_string(), false)
        );
    }

    #[test]
    fn missing_api_host_uses_local_default() {
        assert_eq!(
            api_host_and_auth(None, false),
            ("localhost:3000".to_string(), false)
        );
    }

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
