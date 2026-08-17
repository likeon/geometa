//! Shared layered configuration for the Discord bot (challenge + gateway modes).
//!
//! YAML values load first, then selected environment variables override them.
//! All structs use `#[serde(deny_unknown_fields)]`: renaming or removing a
//! field must break parsing loudly instead of silently diverging from the
//! config files and tests that embed `flux/config.yaml`.

use std::collections::HashMap;
use std::fmt;
use std::sync::LazyLock;

use config::{Config, Environment, File, FileFormat};
use serde::Deserialize;

use crate::Error;

pub const CONFIG_PATH: &str = "config.yaml";

pub static CONFIG: LazyLock<BotConfig> = LazyLock::new(|| {
    load_config().unwrap_or_else(|error| panic!("failed to load {CONFIG_PATH}: {error}"))
});

pub const MAX_BUTTONS: usize = 25;
pub const MAX_BUTTON_LABEL: usize = 80;

const DEFAULT_BAN_DELETE_SECONDS: u64 = 900;
const DEFAULT_QUEUE_CAPACITY: usize = 256;
const DEFAULT_SPAM_THRESHOLD: f64 = 0.5;
const DEFAULT_ONNX_MAX_CONCURRENCY: usize = 4;
const DEFAULT_ONNX_TIMEOUT_SECONDS: u64 = 10;
pub const DEFAULT_OPENROUTER_MODEL: &str = "xiaomi/mimo-v2.5";
const DEFAULT_OPENROUTER_MAX_CONCURRENCY: usize = 2;
const DEFAULT_OPENROUTER_TIMEOUT_SECONDS: u64 = 30;
const DEFAULT_MAX_IMAGES_PER_REQUEST: usize = 8;
const DEFAULT_MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;

const MAX_QUEUE_CAPACITY: usize = 1_000_000;
const MAX_CONCURRENCY: usize = 64;
const MAX_DEPENDENCY_TIMEOUT_SECONDS: u64 = 3_600;
/// Discord allows at most 10 attachments per message; the OpenRouter batch
/// cap and the per-file evidence cap reflect that bound.
const MAX_IMAGES_PER_REQUEST: usize = 10;

/// Per-attachment byte cap: Discord's upload ceiling is 25 MiB for
/// non-boosted servers; caps beyond 20 MiB are rejected to bound classifier
/// payloads and evidence disk usage.
const MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;

pub const ENV_API_HOST: &str = "API_HOST";
pub const ENV_API_DISABLE_K8S_AUTH: &str = "API_DISABLE_K8S_AUTH";
pub const ENV_DISCORD_TOKEN: &str = "DISCORD_TOKEN";
pub const ENV_SPAM_ONNX_API_URL: &str = "SPAM_ONNX_API_URL";
pub const ENV_SPAM_ONNX_TOKENIZER_PATH: &str = "SPAM_ONNX_TOKENIZER_PATH";
pub const ENV_OPENROUTER_API_KEY: &str = "OPENROUTER_API_KEY";

const ENV_MAPPINGS: [(&str, &str); 4] = [
    (ENV_DISCORD_TOKEN, "discord.token"),
    (ENV_SPAM_ONNX_API_URL, "services.onnx.api_url"),
    (ENV_SPAM_ONNX_TOKENIZER_PATH, "services.onnx.tokenizer_path"),
    (ENV_OPENROUTER_API_KEY, "services.openrouter.api_key"),
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BotConfig {
    #[serde(default)]
    pub discord: DiscordConfig,
    #[serde(default)]
    pub services: ServicesConfig,
    #[serde(default)]
    pub challenge: ChallengeConfig,
    #[serde(default)]
    pub game_modes: HashMap<String, GameMode>,
    #[serde(default)]
    pub pools: Vec<Pool>,
    #[serde(default)]
    pub spam_detection: Option<SpamDetection>,
}

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DiscordConfig {
    pub token: Option<SecretString>,
}

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ServicesConfig {
    #[serde(default)]
    pub onnx: OnnxServiceConfig,
    #[serde(default)]
    pub openrouter: OpenRouterServiceConfig,
}

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OnnxServiceConfig {
    pub api_url: Option<String>,
    pub tokenizer_path: Option<String>,
}

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OpenRouterServiceConfig {
    pub api_key: Option<SecretString>,
}

#[derive(Clone, Deserialize)]
#[serde(transparent)]
pub struct SecretString(String);

impl SecretString {
    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for SecretString {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("[REDACTED]")
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ChallengeConfig {
    pub channel_id: u64,
    pub time_limit: u32,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GameMode {
    pub settings: ModeSettings,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModeSettings {
    pub forbid_moving: bool,
    pub forbid_rotating: bool,
    pub forbid_zooming: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pool {
    pub name: String,
    #[serde(default)]
    pub maps: Vec<Map>,
    pub learnable_meta: Option<LearnableMeta>,
    #[serde(default)]
    pub game_modes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct LearnableMeta {
    pub region: Option<String>,
    pub is_shared: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Map {
    pub name: String,
    pub map_id: String,
    pub game_modes: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SpamDetectionMode {
    Alert,
    Ban,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SpamDetection {
    pub mode: SpamDetectionMode,
    pub guild_id: u64,
    pub moderation_channel_id: u64,
    #[serde(default = "default_ban_delete_seconds")]
    pub ban_delete_message_seconds: u64,
    #[serde(default = "default_queue_capacity")]
    pub queue_capacity: usize,
    pub onnx: OnnxConfig,
    pub openrouter: OpenRouterClassifierConfig,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OnnxConfig {
    pub model: String,
    pub version: String,
    #[serde(default = "default_spam_threshold")]
    pub spam_threshold: f64,
    #[serde(default = "default_onnx_max_concurrency")]
    pub max_concurrency: usize,
    #[serde(default = "default_onnx_timeout_seconds")]
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OpenRouterClassifierConfig {
    #[serde(default = "default_openrouter_model")]
    pub model: String,
    #[serde(default = "default_openrouter_max_concurrency")]
    pub max_concurrency: usize,
    #[serde(default = "default_openrouter_timeout_seconds")]
    pub timeout_seconds: u64,
    #[serde(default = "default_max_images_per_request")]
    pub max_images_per_request: usize,
    #[serde(default = "default_max_image_bytes")]
    pub max_image_bytes: u64,
}

pub fn load_config() -> Result<BotConfig, Error> {
    let config = Config::builder()
        .add_source(File::new(CONFIG_PATH, FileFormat::Yaml).required(false))
        .add_source(environment_source_from(std::env::vars()))
        .build()?
        .try_deserialize()?;
    Ok(config)
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApiClientConfig {
    pub host: String,
    pub requires_jwt: bool,
}

/// Loads and validates internal API connection settings before either runtime
/// mode performs network work.
pub fn load_api_client_config() -> Result<ApiClientConfig, Error> {
    api_client_config_from(
        std::env::var(ENV_API_HOST),
        std::env::var(ENV_API_DISABLE_K8S_AUTH),
    )
}

fn api_client_config_from(
    configured_host: Result<String, std::env::VarError>,
    disable_k8s_auth: Result<String, std::env::VarError>,
) -> Result<ApiClientConfig, Error> {
    let configured_host = match configured_host {
        Ok(host) if host.trim().is_empty() => {
            return Err(invalid(format!("{ENV_API_HOST} must not be empty")));
        }
        Ok(host) => Some(host),
        Err(std::env::VarError::NotPresent) => None,
        Err(std::env::VarError::NotUnicode(_)) => {
            return Err(invalid(format!("{ENV_API_HOST} must be valid UTF-8")));
        }
    };
    let disable_k8s_auth = match disable_k8s_auth {
        Ok(value) => value
            .parse::<bool>()
            .map_err(|_| invalid(format!("{ENV_API_DISABLE_K8S_AUTH} must be true or false")))?,
        Err(std::env::VarError::NotPresent) => false,
        Err(std::env::VarError::NotUnicode(_)) => {
            return Err(invalid(format!(
                "{ENV_API_DISABLE_K8S_AUTH} must be valid UTF-8"
            )));
        }
    };

    let requires_jwt = configured_host.is_some() && !disable_k8s_auth;
    let host = configured_host.unwrap_or_else(|| "localhost:3000".to_string());
    validate_api_host(&host)?;
    Ok(ApiClientConfig { host, requires_jwt })
}

fn validate_api_host(host: &str) -> Result<(), Error> {
    if host != host.trim()
        || host.contains('/')
        || host.contains('\\')
        || host.chars().any(char::is_control)
    {
        return Err(invalid(format!(
            "{ENV_API_HOST} must contain only a host and optional port"
        )));
    }

    let url = reqwest::Url::parse(&format!("http://{host}/api"))
        .map_err(|error| invalid(format!("{ENV_API_HOST} is invalid: {error}")))?;
    if url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/api"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(invalid(format!(
            "{ENV_API_HOST} must contain only a host and optional port"
        )));
    }
    Ok(())
}

#[cfg(test)]
fn parse_config(source: &str) -> Result<BotConfig, Error> {
    parse_config_with_environment(source, std::iter::empty())
}

#[cfg(test)]
fn parse_config_with_environment(
    source: &str,
    environment: impl IntoIterator<Item = (String, String)>,
) -> Result<BotConfig, Error> {
    let config = Config::builder()
        .add_source(File::from_str(source, FileFormat::Yaml))
        .add_source(environment_source_from(environment))
        .build()?
        .try_deserialize()?;
    validate_document(&config)?;
    Ok(config)
}

fn environment_source_from(values: impl IntoIterator<Item = (String, String)>) -> Environment {
    let values: HashMap<String, String> = values.into_iter().collect();
    let mapped = ENV_MAPPINGS
        .iter()
        .filter_map(|(environment_key, config_key)| {
            values
                .get(*environment_key)
                .map(|value| ((*config_key).to_string(), value.clone()))
        })
        .collect();
    Environment::default().source(Some(mapped))
}

impl BotConfig {
    pub fn validate_challenge(&self) -> Result<(), Error> {
        validate_document(self)?;
        self.discord_token()?;
        Ok(())
    }

    pub fn validate_gateway(&self) -> Result<(), Error> {
        self.discord_token()?;
        if let Some(spam) = &self.spam_detection {
            validate_spam_detection(spam)?;
            self.services.validate_spam_dependencies()?;
        }
        Ok(())
    }

    pub fn discord_token(&self) -> Result<&str, Error> {
        required_secret(
            self.discord.token.as_ref(),
            "discord.token",
            ENV_DISCORD_TOKEN,
        )
    }
}

impl ServicesConfig {
    fn validate_spam_dependencies(&self) -> Result<(), Error> {
        self.onnx_api_url()?;
        self.onnx_tokenizer_path()?;
        self.openrouter_api_key()?;
        Ok(())
    }

    pub fn onnx_api_url(&self) -> Result<&str, Error> {
        required_value(
            self.onnx.api_url.as_deref(),
            "services.onnx.api_url",
            ENV_SPAM_ONNX_API_URL,
        )
    }

    pub fn onnx_tokenizer_path(&self) -> Result<&str, Error> {
        required_value(
            self.onnx.tokenizer_path.as_deref(),
            "services.onnx.tokenizer_path",
            ENV_SPAM_ONNX_TOKENIZER_PATH,
        )
    }

    pub fn openrouter_api_key(&self) -> Result<&str, Error> {
        required_secret(
            self.openrouter.api_key.as_ref(),
            "services.openrouter.api_key",
            ENV_OPENROUTER_API_KEY,
        )
    }
}

fn required_secret<'a>(
    value: Option<&'a SecretString>,
    path: &str,
    environment_key: &str,
) -> Result<&'a str, Error> {
    required_value(value.map(SecretString::expose), path, environment_key)
}

fn required_value<'a>(
    value: Option<&'a str>,
    path: &str,
    environment_key: &str,
) -> Result<&'a str, Error> {
    match value {
        Some(value) if !value.trim().is_empty() => Ok(value),
        _ => Err(invalid(format!(
            "{path} must be set in {CONFIG_PATH} or {environment_key}"
        ))),
    }
}

fn validate_document(config: &BotConfig) -> Result<(), Error> {
    if config.challenge.channel_id == 0 {
        return Err(invalid("challenge.channel_id must be positive"));
    }
    if config.game_modes.is_empty() {
        return Err(invalid("game_modes must not be empty"));
    }
    if config.pools.is_empty() || config.pools.len() > MAX_BUTTONS {
        return Err(invalid("pools must contain between 1 and 25 entries"));
    }

    for pool in &config.pools {
        if pool.name.trim().is_empty() {
            return Err(invalid("pool names must not be empty"));
        }
        match (pool.maps.is_empty(), pool.learnable_meta.as_ref()) {
            (false, None) => {
                for map in &pool.maps {
                    if map.name.trim().is_empty() || map.map_id.trim().is_empty() {
                        return Err(invalid(format!(
                            "{} contains a map without a name or map_id",
                            pool.name
                        )));
                    }
                    validate_modes(&map.game_modes, &config.game_modes, &pool.name)?;
                }
            }
            (true, Some(source)) => {
                if source.region.as_ref().is_some_and(|value| value.is_empty()) {
                    return Err(invalid(format!("{} has an empty region", pool.name)));
                }
                validate_modes(&pool.game_modes, &config.game_modes, &pool.name)?;
            }
            _ => {
                return Err(invalid(format!(
                    "{} must configure either maps or learnable_meta",
                    pool.name
                )));
            }
        }
    }

    if let Some(spam) = &config.spam_detection {
        validate_spam_detection(spam)?;
    }
    Ok(())
}

fn validate_health(value: usize, path: &str) -> Result<(), Error> {
    if value == 0 {
        return Err(invalid(format!("{path} must be positive")));
    }
    Ok(())
}

fn validate_spam_detection(spam: &SpamDetection) -> Result<(), Error> {
    if spam.guild_id == 0 {
        return Err(invalid("spam_detection.guild_id must be positive"));
    }
    if spam.moderation_channel_id == 0 {
        return Err(invalid(
            "spam_detection.moderation_channel_id must be positive",
        ));
    }
    if spam.guild_id == spam.moderation_channel_id {
        return Err(invalid(
            "spam_detection.guild_id and moderation_channel_id must differ",
        ));
    }

    if spam.ban_delete_message_seconds != DEFAULT_BAN_DELETE_SECONDS {
        return Err(invalid(format!(
            "spam_detection.ban_delete_message_seconds must be exactly {DEFAULT_BAN_DELETE_SECONDS} (Discord 15-minute cleanup)"
        )));
    }
    if spam.queue_capacity == 0 || spam.queue_capacity > MAX_QUEUE_CAPACITY {
        return Err(invalid(format!(
            "spam_detection.queue_capacity must be between 1 and {}",
            MAX_QUEUE_CAPACITY
        )));
    }

    if spam.onnx.model.trim().is_empty() || spam.onnx.version.trim().is_empty() {
        return Err(invalid("spam_detection.onnx.model and version must be set"));
    }
    let threshold = spam.onnx.spam_threshold;
    if !threshold.is_finite() || !(0.0..=1.0).contains(&threshold) {
        return Err(invalid(
            "spam_detection.onnx.spam_threshold must be finite and between 0 and 1",
        ));
    }
    validate_health(
        spam.onnx.max_concurrency,
        "spam_detection.onnx.max_concurrency",
    )?;
    if spam.onnx.max_concurrency > MAX_CONCURRENCY {
        return Err(invalid(format!(
            "spam_detection.onnx.max_concurrency must not exceed {}",
            MAX_CONCURRENCY
        )));
    }
    if !(1..=MAX_DEPENDENCY_TIMEOUT_SECONDS).contains(&spam.onnx.timeout_seconds) {
        return Err(invalid(format!(
            "spam_detection.onnx.timeout_seconds must be between 1 and {}",
            MAX_DEPENDENCY_TIMEOUT_SECONDS
        )));
    }

    if spam.openrouter.model.trim().is_empty() {
        return Err(invalid("spam_detection.openrouter.model must be set"));
    }
    validate_health(
        spam.openrouter.max_concurrency,
        "spam_detection.openrouter.max_concurrency",
    )?;
    if spam.openrouter.max_concurrency > MAX_CONCURRENCY {
        return Err(invalid(format!(
            "spam_detection.openrouter.max_concurrency must not exceed {}",
            MAX_CONCURRENCY
        )));
    }
    if !(1..=MAX_DEPENDENCY_TIMEOUT_SECONDS).contains(&spam.openrouter.timeout_seconds) {
        return Err(invalid(format!(
            "spam_detection.openrouter.timeout_seconds must be between 1 and {}",
            MAX_DEPENDENCY_TIMEOUT_SECONDS
        )));
    }
    if spam.openrouter.max_images_per_request == 0
        || spam.openrouter.max_images_per_request > MAX_IMAGES_PER_REQUEST
    {
        return Err(invalid(format!(
            "spam_detection.openrouter.max_images_per_request must be between 1 and {}",
            MAX_IMAGES_PER_REQUEST
        )));
    }
    if spam.openrouter.max_image_bytes == 0 || spam.openrouter.max_image_bytes > MAX_IMAGE_BYTES {
        return Err(invalid(format!(
            "spam_detection.openrouter.max_image_bytes must be between 1 and {}",
            MAX_IMAGE_BYTES
        )));
    }
    Ok(())
}

fn validate_modes(
    names: &[String],
    modes: &HashMap<String, GameMode>,
    owner: &str,
) -> Result<(), Error> {
    if names.is_empty() {
        return Err(invalid(format!("{owner} has no game modes")));
    }
    if let Some(name) = names.iter().find(|name| !modes.contains_key(*name)) {
        return Err(invalid(format!("{owner} references unknown mode {name}")));
    }
    Ok(())
}

fn default_ban_delete_seconds() -> u64 {
    DEFAULT_BAN_DELETE_SECONDS
}

fn default_queue_capacity() -> usize {
    DEFAULT_QUEUE_CAPACITY
}

fn default_spam_threshold() -> f64 {
    DEFAULT_SPAM_THRESHOLD
}

fn default_onnx_max_concurrency() -> usize {
    DEFAULT_ONNX_MAX_CONCURRENCY
}

fn default_onnx_timeout_seconds() -> u64 {
    DEFAULT_ONNX_TIMEOUT_SECONDS
}

fn default_openrouter_model() -> String {
    DEFAULT_OPENROUTER_MODEL.to_string()
}

fn default_openrouter_max_concurrency() -> usize {
    DEFAULT_OPENROUTER_MAX_CONCURRENCY
}

fn default_openrouter_timeout_seconds() -> u64 {
    DEFAULT_OPENROUTER_TIMEOUT_SECONDS
}

fn default_max_images_per_request() -> usize {
    DEFAULT_MAX_IMAGES_PER_REQUEST
}

fn default_max_image_bytes() -> u64 {
    DEFAULT_MAX_IMAGE_BYTES
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
mod tests {
    use super::{
        api_client_config_from, parse_config, parse_config_with_environment, BotConfig,
        DEFAULT_OPENROUTER_MODEL,
    };

    const CONFIG: &str = r#"
challenge:
  channel_id: 123
  time_limit: 0
game_modes:
  nm:
    settings:
      forbid_moving: true
      forbid_rotating: false
      forbid_zooming: false
pools:
  - name: Featured
    maps:
      - name: Map One
        map_id: map-1
        game_modes: [nm]
  - name: Learnable
    learnable_meta: {}
    game_modes: [nm]
"#;

    const SPAM: &str = r#"
spam_detection:
  mode: alert
  guild_id: 100
  moderation_channel_id: 200
  onnx:
    model: tanaos-spam-detection-v1
    version: v1
    spam_threshold: 0.5
  openrouter: {}
"#;

    fn parse_spam(source: &str) -> Result<BotConfig, crate::Error> {
        parse_config(&format!("{CONFIG}\n{source}"))
    }

    #[test]
    fn parses_minimal_config_and_rejects_removed_fields() {
        assert!(parse_config(CONFIG).is_ok());
        assert!(parse_config(include_str!("../flux/config.yaml")).is_ok());
        assert!(
            parse_config(&CONFIG.replace("  time_limit: 0", "  time_limit: 0\n  rounds: 10"))
                .is_err()
        );
        assert!(parse_config(
            &CONFIG.replace("  time_limit: 0", "  time_limit: 0\n  post_time: 12:00")
        )
        .is_err());
    }

    #[test]
    fn rejects_configurable_openrouter_url() {
        let source =
            format!("{CONFIG}\nservices:\n  openrouter:\n    api_url: https://example.com\n");
        assert!(parse_config(&source).is_err());
    }

    #[test]
    fn spam_detection_is_optional() {
        assert!(parse_config(CONFIG).unwrap().spam_detection.is_none());
    }

    #[test]
    fn environment_overrides_yaml_without_enabling_spam_detection() -> Result<(), crate::Error> {
        let source = format!(
            "{CONFIG}\ndiscord:\n  token: yaml-token\nservices:\n  onnx:\n    api_url: http://yaml\n  openrouter:\n    api_key: yaml-key\n"
        );
        let config = parse_config_with_environment(
            &source,
            [
                ("DISCORD_TOKEN".to_string(), "env-token".to_string()),
                (
                    "SPAM_ONNX_API_URL".to_string(),
                    "http://environment".to_string(),
                ),
                ("OPENROUTER_API_KEY".to_string(), "env-key".to_string()),
            ],
        )?;

        assert_eq!(config.discord_token()?, "env-token");
        assert_eq!(config.services.onnx_api_url()?, "http://environment");
        assert_eq!(config.services.openrouter_api_key()?, "env-key");
        assert!(config.spam_detection.is_none());
        assert_eq!(
            config
                .discord
                .token
                .as_ref()
                .map(|token| format!("{token:?}"))
                .as_deref(),
            Some("[REDACTED]")
        );
        Ok(())
    }

    #[test]
    fn parses_valid_spam_detection_with_default_or_configured_model() {
        let config = parse_spam(SPAM).expect("default model config");
        assert_eq!(
            config.spam_detection.expect("spam config").openrouter.model,
            DEFAULT_OPENROUTER_MODEL
        );

        let configured = SPAM.replace(
            "  openrouter: {}",
            "  openrouter:\n    model: example/custom-vision-model",
        );
        let config = parse_spam(&configured).expect("configured model");
        assert_eq!(
            config.spam_detection.expect("spam config").openrouter.model,
            "example/custom-vision-model"
        );
    }

    #[test]
    fn rejects_blank_openrouter_model() {
        let source = SPAM.replace("  openrouter: {}", "  openrouter:\n    model: ' '");
        assert!(parse_spam(&source).is_err());
    }

    #[test]
    fn rejects_unknown_spam_mode() {
        assert!(parse_spam(&SPAM.replace("mode: alert", "mode: nuke")).is_err());
    }

    #[test]
    fn rejects_zero_spam_ids() {
        let missing_guild = SPAM.replace("guild_id: 100", "guild_id: 0");
        assert!(parse_spam(&missing_guild).is_err());

        let missing_channel =
            SPAM.replace("moderation_channel_id: 200", "moderation_channel_id: 0");
        assert!(parse_spam(&missing_channel).is_err());
    }

    #[test]
    fn rejects_indistinct_spam_ids() {
        let same = SPAM.replace("moderation_channel_id: 200", "moderation_channel_id: 100");
        assert!(parse_spam(&same).is_err());
    }

    #[test]
    fn rejects_out_of_bounds_spam_threshold() {
        for value in ["-0.1", "1.5", "0.5.1"] {
            let source = SPAM.replace("spam_threshold: 0.5", &format!("spam_threshold: {value}"));
            assert!(parse_spam(&source).is_err(), "threshold {value}");
        }
    }

    #[test]
    fn rejects_non_900_ban_cleanup() {
        for value in ["0", "1", "901", "604800"] {
            let source = SPAM.replace(
                "  openrouter:",
                &format!("  ban_delete_message_seconds: {value}\n  openrouter:"),
            );
            assert!(
                parse_spam(&source).is_err(),
                "cleanup window {value} must be rejected"
            );
        }
        // Explicitly setting the required value stays valid.
        let source = SPAM.replace(
            "  openrouter:",
            "  ban_delete_message_seconds: 900\n  openrouter:",
        );
        assert!(parse_spam(&source).is_ok());
    }

    #[test]
    fn rejects_zero_image_limit() {
        let source = SPAM.replace(
            "  openrouter: {}",
            "  openrouter:\n    max_images_per_request: 0",
        );
        assert!(parse_spam(&source).is_err());
    }

    #[test]
    fn rejects_limits_above_discord_capabilities() {
        // More images per request than Discord allows attachments per message.
        let too_many = SPAM.replace(
            "  openrouter: {}",
            "  openrouter:\n    max_images_per_request: 11",
        );
        assert!(parse_spam(&too_many).is_err());

        // Per-attachment cap above 20 MiB is rejected.
        let oversized = SPAM.replace(
            "  openrouter: {}",
            "  openrouter:\n    max_image_bytes: 20971521",
        );
        assert!(parse_spam(&oversized).is_err());

        // The documented defaults stay valid.
        assert!(parse_spam(SPAM).is_ok());
    }

    #[test]
    fn api_client_config_defaults_to_unauthenticated_loopback() {
        let config = api_client_config_from(
            Err(std::env::VarError::NotPresent),
            Err(std::env::VarError::NotPresent),
        )
        .expect("default API config");
        assert_eq!(config.host, "localhost:3000");
        assert!(!config.requires_jwt);
    }

    #[test]
    fn configured_api_host_and_auth_flag_are_parsed_at_startup() {
        let authenticated = api_client_config_from(
            Ok("api:3000".to_string()),
            Err(std::env::VarError::NotPresent),
        )
        .expect("authenticated API config");
        assert_eq!(authenticated.host, "api:3000");
        assert!(authenticated.requires_jwt);

        let local =
            api_client_config_from(Ok("localhost:3000".to_string()), Ok("true".to_string()))
                .expect("local API config");
        assert!(!local.requires_jwt);
    }

    #[test]
    fn rejects_invalid_api_environment_values() {
        assert!(
            api_client_config_from(Ok("api:3000".to_string()), Ok("sometimes".to_string()),)
                .is_err()
        );
        for host in [
            "",
            "https://api.example",
            "api:3000/path",
            "api:3000/.",
            "api:3000/foo/..",
            "api\\evil",
            " api:3000",
            "api:3000 ",
            "user@api:3000",
        ] {
            assert!(
                api_client_config_from(Ok(host.to_string()), Err(std::env::VarError::NotPresent),)
                    .is_err(),
                "host {host:?} must be rejected"
            );
        }
    }

    #[cfg(unix)]
    #[test]
    fn rejects_non_utf8_api_environment_values() {
        use std::os::unix::ffi::OsStringExt;

        let non_utf8 = std::ffi::OsString::from_vec(vec![0xff]);
        assert!(api_client_config_from(
            Err(std::env::VarError::NotUnicode(non_utf8.clone())),
            Err(std::env::VarError::NotPresent),
        )
        .is_err());
        assert!(api_client_config_from(
            Err(std::env::VarError::NotPresent),
            Err(std::env::VarError::NotUnicode(non_utf8)),
        )
        .is_err());
    }
}
