use std::{fmt::Debug, sync::LazyLock, time::Duration};

use log::error;
use poise::serenity_prelude::UserId;
use reqwest::{Client as ReqwestClient, Method, RequestBuilder};
use serde::{Deserialize, Serialize};

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
    fn new() -> Self {
        let (api_host, requires_jwt) = match std::env::var("API_HOST") {
            Ok(value) => (value, true),
            Err(_) => ("localhost:3000".to_string(), false),
        };
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

#[derive(Debug, Serialize)]
pub struct ChallengeRequest<'a> {
    pub geoguessr_map_id: &'a str,
    pub rounds: u32,
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
