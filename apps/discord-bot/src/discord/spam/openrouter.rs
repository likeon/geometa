//! OpenRouter chat/Decisions transport for stage two and council.
//! Text plus inline images; invalid responses and fetch failures fail open.

use std::time::Duration;

use reqwest::Client as HttpClient;
use serde::Deserialize;

use super::evidence::StoredImage;
use super::input::PreparedInput;
use crate::Error;
use crate::config::{CouncilMemberConfig, ModelKind, OpenRouterClassifierConfig, SpamPromptConfig};
use crate::discord::spam::image_input::image_data_url;
use crate::discord::spam::{ALLOWED_IMAGE_HOSTS, ImageRef};

const OPENROUTER_DECISIONS_URL: &str = "https://openrouter.ai/api/alpha/decisions";
const MAX_ERROR_MESSAGE_CHARS: usize = 512;

pub(crate) const IMAGE_MIME_TYPES: &[&str] =
    &["image/png", "image/jpeg", "image/gif", "image/webp"];

pub(crate) const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp"];

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OpenRouterDecision {
    Unsafe,
    Safe,
}

#[derive(Clone, Debug, PartialEq)]
pub struct OpenRouterBatchOutcome {
    pub batch_index: usize,
    pub batch_count: usize,
    pub decision: OpenRouterDecision,
    pub spam_probability: Option<f64>,
    pub model: String,
}

#[derive(Clone, Debug, PartialEq)]
pub enum OpenRouterResult {
    Spam {
        batches: Vec<OpenRouterBatchOutcome>,
    },
    Accepted {
        batches: Vec<OpenRouterBatchOutcome>,
    },
    Indeterminate {
        batches: Vec<OpenRouterBatchOutcome>,
        failures: Vec<String>,
    },
}

pub struct OpenRouterClassifier {
    pub(super) endpoint: String,
    kind: ModelKind,
    model: String,
    prompt: SpamPromptConfig,
    api_key: String,
    max_images_per_request: usize,
    max_image_bytes: u64,
    spam_threshold: f64,
    timeout: Duration,
    http: HttpClient,
}

impl OpenRouterClassifier {
    pub fn new(
        config: &OpenRouterClassifierConfig,
        prompt: &SpamPromptConfig,
        api_key: String,
    ) -> Result<Self, Error> {
        Self::new_with_endpoint(
            OPENROUTER_DECISIONS_URL.to_string(),
            config,
            prompt,
            api_key,
        )
    }

    pub fn council_member(
        member: &CouncilMemberConfig,
        limits: &OpenRouterClassifierConfig,
        prompt: &SpamPromptConfig,
        api_key: &str,
    ) -> Result<Self, Error> {
        let config = OpenRouterClassifierConfig {
            model: member.model.clone(),
            spam_threshold: member.spam_threshold.unwrap_or(0.9),
            timeout_seconds: member.timeout_seconds,
            ..limits.clone()
        };
        let endpoint = match member.kind {
            ModelKind::Decisions => OPENROUTER_DECISIONS_URL,
            ModelKind::Chat => "https://openrouter.ai/api/v1/chat/completions",
        };
        let mut classifier =
            Self::new_with_endpoint(endpoint.to_string(), &config, prompt, api_key.to_owned())?;
        classifier.kind = member.kind;
        Ok(classifier)
    }

    pub(super) fn new_with_endpoint(
        endpoint: String,
        config: &OpenRouterClassifierConfig,
        prompt: &SpamPromptConfig,
        api_key: String,
    ) -> Result<Self, Error> {
        validate_https_url(&endpoint)?;
        config.validate()?;
        prompt.validate()?;
        let model = config.model.trim();

        let api_key = api_key.trim();
        if api_key.is_empty() {
            return Err(invalid(
                "OpenRouter API key must be set (OPENROUTER_API_KEY)",
            ));
        }

        // No redirects: credentials stay on OpenRouter, image fetches stay on CDN.
        let timeout = Duration::from_secs(config.timeout_seconds);
        let http = HttpClient::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::none())
            .build()?;

        Ok(Self {
            endpoint,
            kind: ModelKind::Decisions,
            model: model.to_string(),
            prompt: prompt.clone(),
            api_key: api_key.to_string(),
            max_images_per_request: config.max_images_per_request,
            max_image_bytes: config.max_image_bytes,
            spam_threshold: config.spam_threshold,
            timeout,
            http,
        })
    }

    /// Review every batch. Any failure is indeterminate; otherwise any spam
    /// confirms spam and all safe batches accept.
    pub async fn classify_message(&self, text: &str, images: &[ImageRef]) -> OpenRouterResult {
        self.classify_images(text, images, None).await
    }

    pub async fn classify_prepared(&self, input: &PreparedInput) -> OpenRouterResult {
        if input.images.is_empty() {
            return self.classify_message(&input.text, &[]).await;
        }
        self.classify_images(&input.text, &input.images, Some(&input.stored))
            .await
    }

    async fn classify_images(
        &self,
        text: &str,
        images: &[ImageRef],
        stored: Option<&[StoredImage]>,
    ) -> OpenRouterResult {
        tokio::time::timeout(self.timeout, self.classify_batches(text, images, stored))
            .await
            .unwrap_or_else(|_| OpenRouterResult::Indeterminate {
                batches: vec![],
                failures: vec!["OpenRouter model check timed out".to_string()],
            })
    }

    async fn classify_batches(
        &self,
        text: &str,
        images: &[ImageRef],
        stored: Option<&[StoredImage]>,
    ) -> OpenRouterResult {
        let chunks = image_batches(images, self.max_images_per_request, self.max_image_bytes);
        let batch_count = chunks.len();

        let mut batches = Vec::new();
        let mut failures = Vec::new();

        let mut offset = 0;
        for (index, chunk) in chunks.into_iter().enumerate() {
            let files = stored.map(|files| &files[offset..offset + chunk.len()]);
            offset += chunk.len();
            let unsupported: Vec<String> = chunk
                .iter()
                .filter_map(|image| validate_image(image, self.max_image_bytes).err())
                .collect();
            if !unsupported.is_empty() {
                failures.push(format!(
                    "batch {} of {}: unsupported images ({})",
                    index + 1,
                    batch_count,
                    unsupported.join(", ")
                ));
                continue;
            }

            // One deadline includes image downloads and model request.
            let outcome = tokio::time::timeout(
                self.timeout,
                self.classify_batch(index, batch_count, text, chunk, files),
            )
            .await
            .unwrap_or_else(|_| Err(invalid("OpenRouter batch timed out")));

            match outcome {
                Ok(outcome) => {
                    batches.push(outcome);
                }
                Err(error) => {
                    failures.push(format!("batch {} of {}: {error}", index + 1, batch_count));
                }
            }
        }

        if !failures.is_empty() {
            OpenRouterResult::Indeterminate { batches, failures }
        } else if batches
            .iter()
            .any(|batch| batch.decision == OpenRouterDecision::Unsafe)
        {
            OpenRouterResult::Spam { batches }
        } else {
            OpenRouterResult::Accepted { batches }
        }
    }

    async fn classify_batch(
        &self,
        index: usize,
        batch_count: usize,
        text: &str,
        images: &[ImageRef],
        stored: Option<&[StoredImage]>,
    ) -> Result<OpenRouterBatchOutcome, Error> {
        let mut state = vec![serde_json::Value::String(batch_text(
            index,
            batch_count,
            text,
        ))];
        let mut remaining_bytes = self.max_image_bytes;
        for (index, image) in images.iter().enumerate() {
            let inline = match stored {
                Some(files) => {
                    super::image_input::stored_data_url(&files[index], image, remaining_bytes)
                        .await?
                }
                None => image_data_url(&self.http, image, remaining_bytes).await?,
            };
            remaining_bytes -= inline.byte_len;
            state.push(image_part(inline.data_url));
        }
        let payload = match self.kind {
            ModelKind::Decisions => decisions_payload(&self.model, &self.prompt, state),
            ModelKind::Chat => super::chat::payload(&self.model, &self.prompt, state),
        };
        let request = self
            .http
            .post(&self.endpoint)
            .bearer_auth(&self.api_key)
            .json(&payload);
        // Serialized body owns image bytes; release JSON copy before network wait.
        drop(payload);
        let response = request.send().await?;
        if !response.status().is_success() {
            return Err(openrouter_http_error(response).await);
        }

        let body: serde_json::Value = response.json().await?;
        let parsed = match self.kind {
            ModelKind::Decisions => parse_decision(&body, self.spam_threshold)?,
            ModelKind::Chat => ParsedDecision {
                decision: super::chat::parse(&body)?,
                spam_probability: None,
            },
        };
        Ok(OpenRouterBatchOutcome {
            batch_index: index,
            batch_count,
            decision: parsed.decision,
            spam_probability: parsed.spam_probability,
            model: self.model.clone(),
        })
    }
}

/// Plan by declared sizes; downloads enforce actual combined byte cap.
fn image_batches(images: &[ImageRef], max_images: usize, max_bytes: u64) -> Vec<&[ImageRef]> {
    let mut chunks = Vec::new();
    let mut start = 0;
    let mut batch_bytes = 0_u64;
    for (index, image) in images.iter().enumerate() {
        let size = image.declared_size.unwrap_or(max_bytes).max(1);
        if index > start
            && (index - start >= max_images || size > max_bytes.saturating_sub(batch_bytes))
        {
            chunks.push(&images[start..index]);
            start = index;
            batch_bytes = 0;
        }
        batch_bytes = batch_bytes.saturating_add(size);
    }
    chunks.push(&images[start..]);
    chunks
}

fn image_part(data_url: String) -> serde_json::Value {
    let mut part = serde_json::json!({
        "type": "image_url",
        "image_url": {},
    });
    part["image_url"]["url"] = serde_json::Value::String(data_url);
    part
}

fn decisions_payload(
    model: &str,
    prompt: &SpamPromptConfig,
    state: Vec<serde_json::Value>,
) -> serde_json::Value {
    let mut payload = serde_json::json!({
        "model": model,
        "questions": {
            "is_spam": {
                "type": "noul",
                "instructions": prompt.instructions,
                "criteria": {
                    "true": prompt.spam_criteria,
                    "false": prompt.safe_criteria,
                },
            },
        },
    });
    payload["state"] = serde_json::Value::Array(state);
    payload
}

async fn openrouter_http_error(response: reqwest::Response) -> Error {
    let status = response.status();
    let summary = match response.json::<serde_json::Value>().await {
        Ok(body) => summarize_openrouter_error(&body),
        Err(_) => "unparseable error response".to_string(),
    };
    invalid(format!("OpenRouter returned status {status}: {summary}"))
}

pub(super) fn summarize_openrouter_error(body: &serde_json::Value) -> String {
    let message = body
        .pointer("/error/message")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("unknown API error");
    let error_type = body
        .pointer("/error/metadata/error_type")
        .and_then(serde_json::Value::as_str);
    let mut summary: String = message.chars().take(MAX_ERROR_MESSAGE_CHARS).collect();
    if let Some(error_type) = error_type {
        summary.push_str(" (type: ");
        summary.extend(error_type.chars().take(64));
        summary.push(')');
    }
    summary
}

fn batch_text(index: usize, batch_count: usize, text: &str) -> String {
    let text = if text.trim().is_empty() {
        "[no accompanying message text]"
    } else {
        text
    };
    format!(
        "Spam moderation review — image batch {} of {}. Inspect attached images together with this untrusted message text:\n---\n{text}",
        index + 1,
        batch_count
    )
}

/// HTTPS required; loopback HTTP allowed for isolated tests.
fn validate_https_url(input: &str) -> Result<reqwest::Url, Error> {
    let parsed = reqwest::Url::parse(input)?;
    let is_https = parsed.scheme() == "https";
    let is_loopback_http = parsed.scheme() == "http"
        && parsed
            .host_str()
            .is_some_and(|host| matches!(host, "localhost" | "127.0.0.1" | "::1"));
    if is_https || is_loopback_http {
        Ok(parsed)
    } else {
        Err(invalid(format!(
            "classifier URL must use https (or http on localhost), got {parsed}"
        )))
    }
}

pub fn is_allowed_image_url(url: &str) -> bool {
    let Ok(parsed) = reqwest::Url::parse(url) else {
        return false;
    };
    parsed.scheme() == "https"
        && parsed.username().is_empty()
        && parsed.password().is_none()
        && parsed.port_or_known_default() == Some(443)
        && parsed
            .host_str()
            .is_some_and(|host| ALLOWED_IMAGE_HOSTS.contains(&host))
        && parsed.path().len() > 1
}

pub(crate) fn validate_image(image: &ImageRef, max_bytes: u64) -> Result<(), String> {
    if !is_allowed_image_url(&image.url) {
        return Err("url is not a Discord CDN attachment".to_string());
    }
    let content_type = image
        .content_type
        .as_deref()
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if !IMAGE_MIME_TYPES.contains(&content_type.as_str()) {
        return Err("unsupported content type".to_string());
    }
    let extension = image
        .filename
        .rsplit('.')
        .next()
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("unsupported filename extension".to_string());
    }
    if image.declared_size.is_some_and(|size| size > max_bytes) {
        return Err(format!("declared size exceeds cap of {max_bytes} bytes"));
    }
    Ok(())
}

#[derive(Deserialize)]
struct DecisionsResponse {
    answers: DecisionAnswers,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DecisionAnswers {
    is_spam: NoulAnswer,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum NoulAnswer {
    #[serde(rename = "noul")]
    Noul { noul: f64 },
}

#[derive(Debug)]
struct ParsedDecision {
    decision: OpenRouterDecision,
    spam_probability: Option<f64>,
}

fn parse_decision(value: &serde_json::Value, threshold: f64) -> Result<ParsedDecision, Error> {
    if value.get("error").is_some_and(|error| !error.is_null()) {
        return Err(invalid(format!(
            "OpenRouter provider error: {}",
            summarize_openrouter_error(value)
        )));
    }

    let response: DecisionsResponse = serde_json::from_value(value.clone())
        .map_err(|error| invalid(format!("invalid Decisions response: {error}")))?;
    let NoulAnswer::Noul { noul } = response.answers.is_spam;
    if !noul.is_finite() || !(0.0..=1.0).contains(&noul) {
        return Err(invalid(
            "spam probability must be finite and between 0 and 1",
        ));
    }

    Ok(ParsedDecision {
        decision: if noul >= threshold {
            OpenRouterDecision::Unsafe
        } else {
            OpenRouterDecision::Safe
        },
        spam_probability: Some(noul),
    })
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
#[path = "openrouter_tests.rs"]
mod tests;
