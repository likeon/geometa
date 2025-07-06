use std::{fmt::Debug, sync::LazyLock};

use log::error;
use poise::serenity_prelude::UserId;
use reqwest::{Client as ReqwestClient, Method, RequestBuilder};
use serde::{Deserialize, Serialize};

const TOKEN_PATH: &str = "/var/run/secrets/kubernetes.io/serviceaccount/token";

trait AuthExt {
    async fn with_k8s_auth(self) -> Result<RequestBuilder, Box<dyn std::error::Error>>;
}

impl AuthExt for RequestBuilder {
    async fn with_k8s_auth(self) -> Result<RequestBuilder, Box<dyn std::error::Error>> {
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
            reqwest_client: ReqwestClient::new(),
        }
    }

    async fn request(&self, method: Method, path: &str) -> RequestBuilder {
        let url = format!("{}/{}", self.base_path, path);
        let builder = self.reqwest_client.request(method, url);

        if self.requires_jwt {
            builder.with_k8s_auth().await.unwrap()
        } else {
            builder
        }
    }
}

static REQUESTER: LazyLock<Requester> = LazyLock::new(Requester::new);
pub struct Client {}
impl Client {
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
            .await
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
}

impl From<reqwest::Error> for PublishMapError {
    fn from(error: reqwest::Error) -> Self {
        PublishMapError::Unknown(error.to_string(), Some(error))
    }
}
