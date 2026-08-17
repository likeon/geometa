//! Moderator-facing spam embeds plus private, capped image preservation.
//! Technical failures stay in application logs and never cancel a confirmed
//! classification decision.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use poise::serenity_prelude as serenity;
use serenity::builder::{
    CreateAllowedMentions, CreateAttachment, CreateEmbed, CreateEmbedFooter, CreateMessage,
};
use serenity::http::Http;
use serenity::model::{Timestamp, id::ChannelId};

use tokio::io::AsyncWriteExt as _;

use crate::Error;
use crate::discord::spam::ImageRef;

const ALERT_COLOUR: u32 = 0xED_42_45;
const MESSAGE_PREVIEW_CHARS: usize = 700;

/// Stale temp roots older than this are swept at startup.
const DEFAULT_STALE_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);

pub fn case_id(guild_id: u64, message_id: u64) -> String {
    format!("{guild_id}/{message_id}")
}

pub fn message_link(guild_id: u64, channel_id: u64, message_id: u64) -> String {
    format!("https://discord.com/channels/{guild_id}/{channel_id}/{message_id}")
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Enforcement {
    AlertOnly,
    ConfirmedBan,
    BanFailed(String),
    NotApplied(String),
}

#[derive(Clone, Debug, Default)]
pub struct EvidenceMeta {
    pub guild_id: u64,
    pub channel_id: u64,
    pub message_id: u64,
    pub author_id: u64,
    pub author_name: String,
    pub channel_name: Option<String>,
    pub timestamp: Option<String>,
    pub content: String,
    pub images: Vec<ImageRef>,
}

pub fn build_alert_embed(meta: &EvidenceMeta, enforcement: &Enforcement) -> CreateEmbed {
    let link = message_link(meta.guild_id, meta.channel_id, meta.message_id);
    let location = match &meta.channel_name {
        Some(name) => format!("[#{}]({link})", escape_markdown(name)),
        None => format!("[View original message]({link})"),
    };

    let mut embed = CreateEmbed::new()
        .title("🚨 Spam detected")
        .url(link.clone())
        .colour(ALERT_COLOUR)
        .description(spoiler_preview(&meta.content))
        .field(
            "Author",
            format!(
                "<@{}> ({})",
                meta.author_id,
                escape_markdown(&meta.author_name)
            ),
            true,
        )
        .field("Location", location, true)
        .field("Action", enforcement_action(enforcement), false)
        .field(
            "Original message",
            format!("[Open in Discord]({link})"),
            true,
        )
        .footer(CreateEmbedFooter::new("Detected"));

    if !meta.images.is_empty() {
        let count = meta.images.len();
        let label = if count == 1 {
            "1 image attached".to_string()
        } else {
            format!("{count} images attached")
        };
        embed = embed.field("Evidence", label, true);
    }
    if let Some(timestamp) = meta
        .timestamp
        .as_deref()
        .and_then(|value| value.parse::<Timestamp>().ok())
    {
        embed = embed.timestamp(timestamp);
    }
    embed
}

fn enforcement_action(enforcement: &Enforcement) -> &'static str {
    match enforcement {
        Enforcement::AlertOnly => "No action taken — alert mode",
        Enforcement::ConfirmedBan => "User banned — recent messages removed",
        Enforcement::BanFailed(_) => "Ban failed — moderator action required",
        Enforcement::NotApplied(_) => "No action taken — moderator review required",
    }
}

fn spoiler_preview(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return "||_No message text_||".to_string();
    }

    let mut preview: String = trimmed.chars().take(MESSAGE_PREVIEW_CHARS).collect();
    if trimmed.chars().count() > MESSAGE_PREVIEW_CHARS {
        preview.push('…');
    }
    format!("||{}||", escape_markdown(&preview))
}

fn escape_markdown(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(
            character,
            '\\' | '*' | '_' | '~' | '`' | '|' | '[' | ']' | '<' | '>'
        ) {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

pub fn no_mentions() -> CreateAllowedMentions {
    CreateAllowedMentions::new()
        .all_users(false)
        .all_roles(false)
        .everyone(false)
        .replied_user(false)
        .empty_users()
        .empty_roles()
}

/// A successfully preserved image attachment in a private temp file. The file
/// is removed when this value drops; the case directory is removed when the
/// last image of the case drops (sequential processing keeps this bounded).
pub struct StoredImage {
    path: PathBuf,
    filename: String,
    /// Removed when this value drops; the case dir is removed when the
    /// last image of the case drops.
    _case_dir: Arc<CaseDirGuard>,
}

impl StoredImage {
    fn new(path: PathBuf, filename: String, case_dir: Arc<CaseDirGuard>) -> Self {
        Self {
            path,
            filename,
            _case_dir: case_dir,
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn filename(&self) -> &str {
        &self.filename
    }
}

impl Drop for StoredImage {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

/// Removed when the last reference drops (all its files are gone or were
/// never written).
struct CaseDirGuard {
    path: PathBuf,
}

impl CaseDirGuard {
    fn new(path: PathBuf) -> Self {
        Self { path }
    }
}

impl Drop for CaseDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

pub struct EvidenceStorage {
    root: PathBuf,
    http: reqwest::Client,
}

impl EvidenceStorage {
    #[cfg(test)]
    pub fn root(&self) -> &Path {
        &self.root
    }
}

/// Remove a partially written file on failure (or cancellation, which drops
/// the future); disarmed on success.
struct PartialFileGuard {
    path: PathBuf,
    armed: bool,
}

impl PartialFileGuard {
    fn new(path: PathBuf) -> Self {
        Self { path, armed: true }
    }

    fn disarm(&mut self) {
        self.armed = false;
    }
}

impl Drop for PartialFileGuard {
    fn drop(&mut self) {
        if self.armed {
            let _ = std::fs::remove_file(&self.path);
        }
    }
}

impl EvidenceStorage {
    /// Test-only explicit root; production uses `create_private`.
    #[cfg(test)]
    pub fn create(root: PathBuf, stale_max_age: Option<Duration>) -> Result<Self, Error> {
        Self::open_root(&root)?;
        Self::open_at(root, stale_max_age)
    }

    /// Unique per-process root under the temp dir. On Unix it is created
    /// atomically with `0700` (`create` semantics reject pre-existing paths,
    /// preventing symlink/attacker pick-up). Stale roots of crashed
    /// processes, older than 24h, are swept first.
    pub fn create_private() -> Result<Self, Error> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);

        let cutoff = std::time::SystemTime::now()
            .checked_sub(DEFAULT_STALE_MAX_AGE)
            .unwrap_or(std::time::UNIX_EPOCH);
        sweep_stale_private_roots(&std::env::temp_dir(), cutoff)?;

        let pid = std::process::id();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        for _ in 0..128 {
            let counter = COUNTER.fetch_add(1, Ordering::Relaxed);
            let name = format!("discord-bot-spam-evidence-{pid}-{nanos}-{counter}");
            let root = std::env::temp_dir().join(name);
            match create_private_root(&root) {
                Ok(()) => return Self::open_at(root, None),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(error.into()),
            }
        }
        Err(std::io::Error::other("could not allocate a unique evidence directory").into())
    }

    /// Rejects symlink/non-directory roots before any child is created.
    #[cfg(test)]
    fn open_root(root: &Path) -> Result<(), Error> {
        match std::fs::symlink_metadata(root) {
            Ok(meta) => {
                if meta.file_type().is_symlink() {
                    return Err(std::io::Error::other(format!(
                        "evidence root is a symlink: {}",
                        root.display()
                    ))
                    .into());
                }
                if !meta.is_dir() {
                    return Err(std::io::Error::other(format!(
                        "evidence root is not a directory: {}",
                        root.display()
                    ))
                    .into());
                }
                Ok(())
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                std::fs::create_dir_all(root)?;
                Ok(())
            }
            Err(error) => Err(error.into()),
        }
    }

    fn open_at(root: PathBuf, stale_max_age: Option<Duration>) -> Result<Self, Error> {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = std::fs::metadata(&root)
                && meta.is_dir()
            {
                let _ = std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o700));
            }
        }

        let max_age = stale_max_age.unwrap_or(DEFAULT_STALE_MAX_AGE);
        cleanup_stale(&root, max_age)?;

        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .redirect(reqwest::redirect::Policy::none())
            .build()?;
        Ok(Self { root, http })
    }
}

impl Drop for EvidenceStorage {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

/// `0700` is part of the `create` call so the dir is private from the first
/// instant and symlink/attacker pick-up is rejected.
#[cfg(unix)]
fn create_private_root(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::DirBuilderExt;
    std::fs::DirBuilder::new().mode(0o700).create(path)
}

#[cfg(not(unix))]
fn create_private_root(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir(path)
}

/// Sweeps `discord-bot-spam-evidence-*` dirs older than `cutoff`. Symlinks,
/// files, and unrelated/recent paths are untouched; an unreadable temp dir
/// fails loudly.
fn sweep_stale_private_roots(temp: &Path, cutoff: std::time::SystemTime) -> Result<(), Error> {
    for entry in std::fs::read_dir(temp)? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                tracing::debug!("evidence stale sweep: cannot read a temp entry: {error}");
                continue;
            }
        };
        let name = entry.file_name();
        if !name
            .to_string_lossy()
            .starts_with("discord-bot-spam-evidence-")
        {
            continue;
        }
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(error) => {
                tracing::debug!(
                    "evidence stale sweep: cannot stat {:?}: {error}",
                    entry.path()
                );
                continue;
            }
        };
        if !file_type.is_dir() {
            // Directories only; symlinks and stray files sharing the prefix
            // stay untouched.
            continue;
        }
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(error) => {
                tracing::debug!(
                    "evidence stale sweep: cannot stat directory {:?}: {error}",
                    entry.path()
                );
                continue;
            }
        };
        match metadata.modified() {
            Ok(modified) if modified < cutoff => {
                if let Err(error) = std::fs::remove_dir_all(entry.path()) {
                    tracing::debug!(
                        "evidence stale sweep: cannot remove stale root {:?}: {error}",
                        entry.path()
                    );
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl EvidenceStorage {
    /// Downloads every image of one case in order: `(ready, failures)`.
    /// `max_bytes` caps declared + streamed size; `max_case_bytes` the total.
    pub async fn download_all(
        &self,
        case_id: &str,
        images: &[ImageRef],
        max_bytes: u64,
        max_case_bytes: u64,
    ) -> (Vec<StoredImage>, Vec<String>) {
        let case_subdir = self.root.join(sanitize_case_dir(case_id));
        let case_guard = Arc::new(CaseDirGuard::new(case_subdir.clone()));
        if let Err(error) = tokio::fs::create_dir_all(&case_subdir).await {
            let all: Vec<String> = images
                .iter()
                .map(|_| format!("cannot create evidence directory: {error}"))
                .collect();
            return (Vec::new(), all);
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ =
                tokio::fs::set_permissions(&case_subdir, std::fs::Permissions::from_mode(0o700))
                    .await;
        }

        let mut ready = Vec::with_capacity(images.len());
        let mut failures = Vec::new();
        let allowed = Self::cumulative_cap_plan(images, max_case_bytes);
        for (index, image) in images.iter().enumerate() {
            // Once the cumulative cap is reached, the rest are missing evidence.
            if !allowed[index] {
                failures.push(format!(
                    "{}: skips cumulative case cap of {max_case_bytes} bytes",
                    image.filename
                ));
                continue;
            }
            match self
                .download_one(case_id, &case_subdir, &case_guard, index, image, max_bytes)
                .await
            {
                Ok(stored) => ready.push(stored),
                Err(reason) => failures.push(reason),
            }
        }
        drop(case_guard);
        (ready, failures)
    }

    /// Admission plan mirroring the download loop; pure for tests.
    fn cumulative_cap_plan(images: &[ImageRef], max_case_bytes: u64) -> Vec<bool> {
        let mut used = 0u64;
        images
            .iter()
            .map(|image| {
                let declared = image.declared_size.unwrap_or(0);
                if used.saturating_add(declared) > max_case_bytes {
                    false
                } else {
                    used = used.saturating_add(declared);
                    true
                }
            })
            .collect()
    }

    async fn download_one(
        &self,
        case_id: &str,
        case_subdir: &Path,
        case_guard: &Arc<CaseDirGuard>,
        index: usize,
        image: &ImageRef,
        max_bytes: u64,
    ) -> Result<StoredImage, String> {
        // Conservative validation identical to the classifier gate.
        super::openrouter::validate_image(image, max_bytes)
            .map_err(|reason| format!("{}: {reason}", image.filename))?;

        let url = reqwest::Url::parse(&image.url)
            .map_err(|error| format!("{}: invalid URL ({error})", image.filename))?;
        if !super::openrouter::is_allowed_image_url(&image.url) {
            return Err(format!("{}: URL rejected by CDN allowlist", image.filename));
        }

        let response = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|error| format!("{}: download failed ({error})", image.filename))?;
        if !response.status().is_success() {
            return Err(format!(
                "{}: download returned status {}",
                image.filename,
                response.status()
            ));
        }
        // Redirects disabled; the final URL is the original request URL,
        // revalidated so user-supplied URLs never fetch off-CDN.
        let final_url = response.url();
        if !is_allowed_evidence_url(final_url.as_str()) {
            return Err(format!(
                "{}: download resolved outside Discord CDN",
                image.filename
            ));
        }
        if response.content_length().is_some_and(|len| len > max_bytes) {
            return Err(format!(
                "{}: HTTP content-length exceeds cap ({max_bytes} bytes)",
                image.filename
            ));
        }

        let filename = format!(
            "{}-{:03}.{}",
            sanitize_case_dir(case_id),
            index,
            extension_for(image)
        );
        let path = case_subdir.join(filename.clone());
        let written = try_to_file(response, &path, max_bytes)
            .await
            .map_err(|error| format!("{}: {error}", image.filename))?;
        if written == 0 {
            let _ = std::fs::remove_file(&path);
            return Err(format!("{}: download produced no bytes", image.filename));
        }

        Ok(StoredImage::new(path, filename, case_guard.clone()))
    }
}

/// Streams `response` into `path`, enforcing `max_bytes` on the body.
async fn try_to_file(
    response: reqwest::Response,
    path: &Path,
    max_bytes: u64,
) -> Result<u64, String> {
    // `create_new` rejects pre-existing paths; guard armed only after
    // creation succeeds so it can never delete a file it did not create.
    let mut file = tokio::fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .mode(0o600)
        .open(path)
        .await
        .map_err(|error| format!("cannot create evidence file: {error}"))?;
    let mut guard = PartialFileGuard::new(path.to_path_buf());

    let mut streamed = 0u64;
    let result: Result<u64, String> = async {
        let mut stream = response.bytes_stream();
        while let Some(chunk) = futures_util::StreamExt::next(&mut stream).await {
            let chunk = chunk.map_err(|error| format!("stream read failed ({error})"))?;
            let chunk_len = chunk.len() as u64;
            if streamed.saturating_add(chunk_len) > max_bytes {
                return Err(format!("stream exceeded the {max_bytes} byte cap"));
            }
            streamed += chunk_len;
            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
                .await
                .map_err(|error| format!("cannot write evidence file: {error}"))?;
        }
        Ok(streamed)
    }
    .await;

    // Flush/sync before the caller re-reads (tokio fs buffers through the
    // blocking pool); failures fold in so the guard removes the partial file.
    let result = match result {
        Ok(written) => {
            if let Err(error) = file
                .flush()
                .await
                .map_err(|error| format!("cannot flush evidence file: {error}"))
            {
                Err(error)
            } else if let Err(error) = file
                .sync_all()
                .await
                .map_err(|error| format!("cannot sync evidence file: {error}"))
            {
                Err(error)
            } else {
                Ok(written)
            }
        }
        Err(error) => Err(error),
    };

    match result {
        Ok(written) => {
            guard.disarm();
            Ok(written)
        }
        Err(error) => {
            drop(file);
            Err(error)
        }
    }
}

fn is_allowed_evidence_url(url: &str) -> bool {
    super::openrouter::is_allowed_image_url(url)
}

fn extension_for(image: &ImageRef) -> &'static str {
    let from_name = image
        .filename
        .rsplit('.')
        .next()
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    match from_name.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" => match from_name.as_str() {
            "png" | "gif" | "webp" => match from_name.as_str() {
                "png" => "png",
                "gif" => "gif",
                _ => "webp",
            },
            _ => "jpg",
        },
        _ => extension_from_mime(image.content_type.as_deref()),
    }
}

fn extension_from_mime(content_type: Option<&str>) -> &'static str {
    match content_type
        .map(str::to_ascii_lowercase)
        .as_deref()
        .unwrap_or("")
    {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "bin",
    }
}

fn sanitize_case_dir(case_id: &str) -> String {
    case_id
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .map(|ch| ch.to_ascii_lowercase())
        .take(64)
        .collect::<String>()
}

fn cleanup_stale(root: &Path, max_age: Duration) -> Result<(), Error> {
    let cutoff = std::time::SystemTime::now()
        .checked_sub(max_age)
        .unwrap_or(std::time::UNIX_EPOCH);
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let modified = entry.metadata()?.modified();
        match modified {
            Ok(modified) if modified < cutoff => {
                let path = entry.path();
                if path.is_dir() {
                    let _ = std::fs::remove_dir_all(&path);
                } else {
                    let _ = std::fs::remove_file(&path);
                }
            }
            _ => {}
        }
    }
    Ok(())
}

/// Outcome of one alert delivery attempt.
#[derive(Clone, Debug, Default)]
pub struct ReportOutcome {
    pub posts_sent: usize,
    pub post_error: Option<String>,
    pub image_errors: Vec<String>,
}

/// Images travel sequentially (one per message) so peak memory stays
/// bounded by the largest capped image.
#[derive(Clone)]
pub struct AlertReporter {
    http: Arc<Http>,
    moderation_channel: ChannelId,
}

impl AlertReporter {
    pub fn new(http: Arc<Http>, moderation_channel: ChannelId) -> Self {
        Self {
            http,
            moderation_channel,
        }
    }

    pub async fn report(&self, alert: CreateEmbed, images: &[StoredImage]) -> ReportOutcome {
        let mut outcome = ReportOutcome::default();
        let allowed = no_mentions();
        let message = CreateMessage::new()
            .embed(alert)
            .allowed_mentions(allowed.clone());
        match self
            .moderation_channel
            .send_message(&self.http, message)
            .await
        {
            Ok(_) => outcome.posts_sent = 1,
            Err(error) => {
                outcome.post_error = Some(format!("cannot post moderation alert: {error}"));
                return outcome;
            }
        }

        for (index, image) in images.iter().enumerate() {
            let attachment = match CreateAttachment::path(image.path()).await {
                Ok(attachment) => attachment,
                Err(error) => {
                    outcome.image_errors.push(format!(
                        "cannot read preserved image {} ({}): {error}",
                        index + 1,
                        image.filename()
                    ));
                    continue;
                }
            };
            let caption = format!(
                "Preserved spam evidence — image {} of {}: {}",
                index + 1,
                images.len(),
                image.filename()
            );
            let message = CreateMessage::new()
                .content(caption)
                .allowed_mentions(allowed.clone())
                .add_file(attachment);
            if let Err(error) = self
                .moderation_channel
                .send_message(&self.http, message)
                .await
            {
                outcome.image_errors.push(format!(
                    "cannot post preserved image {}: {error}",
                    index + 1
                ));
            }
        }

        outcome
    }
}

#[cfg(test)]
mod tests {
    use super::{
        EvidenceMeta, EvidenceStorage, build_alert_embed, case_id, message_link, no_mentions,
        sanitize_case_dir, spoiler_preview, try_to_file,
    };
    use crate::discord::spam::ImageRef;
    use crate::discord::spam::test_support::MockServer;

    fn image(url: &str, filename: &str, content_type: Option<&str>, size: Option<u64>) -> ImageRef {
        ImageRef {
            url: url.to_string(),
            filename: filename.to_string(),
            content_type: content_type.map(str::to_string),
            declared_size: size,
            width: None,
            height: None,
        }
    }

    fn cdn_image() -> ImageRef {
        image(
            "https://cdn.discordapp.com/attachments/1/2/cat.png",
            "cat.png",
            Some("image/png"),
            Some(512),
        )
    }

    #[test]
    fn message_link_is_stable_discord_url() {
        assert_eq!(message_link(1, 2, 3), "https://discord.com/channels/1/2/3");
    }

    #[test]
    fn case_id_joins_ids() {
        assert_eq!(case_id(10, 20), "10/20");
        assert_eq!(sanitize_case_dir("10/20"), "1020");
        assert_eq!(sanitize_case_dir("aA;B-b_42"), "aabb42");
    }

    #[test]
    fn no_mentions_suppresses_every_channel() {
        let value = serde_json::to_value(no_mentions()).expect("mentions serialize");
        let object = value.as_object().expect("object");
        assert_eq!(
            object.get("parse").and_then(|v| v.as_array()).map(Vec::len),
            Some(0)
        );
        assert_eq!(
            object.get("users").and_then(|v| v.as_array()).map(Vec::len),
            Some(0)
        );
        assert_eq!(
            object.get("roles").and_then(|v| v.as_array()).map(Vec::len),
            Some(0)
        );
        assert_eq!(
            object.get("replied_user").and_then(|v| v.as_bool()),
            Some(false)
        );
    }

    #[test]
    fn alert_embed_is_concise_and_moderator_focused() {
        let meta = EvidenceMeta {
            guild_id: 10,
            channel_id: 20,
            message_id: 30,
            author_id: 40,
            author_name: "offender".into(),
            channel_name: Some("general".into()),
            timestamp: Some("2026-01-01T00:00:00Z".into()),
            content: "claim your free nitro".into(),
            images: vec![cdn_image()],
        };
        let embed = build_alert_embed(&meta, &super::Enforcement::AlertOnly);
        let value = serde_json::to_value(embed).expect("embed serializes");

        assert_eq!(value["title"], "🚨 Spam detected");
        assert_eq!(value["url"], "https://discord.com/channels/10/20/30");
        assert_eq!(value["description"], "||claim your free nitro||");
        assert_eq!(embed_field(&value, "Author"), "<@40> (offender)");
        assert!(embed_field(&value, "Location").contains("#general"));
        assert_eq!(
            embed_field(&value, "Action"),
            "No action taken — alert mode"
        );
        assert_eq!(embed_field(&value, "Evidence"), "1 image attached");
        assert_eq!(value["footer"]["text"], "Detected");
        assert_eq!(value["timestamp"], "2026-01-01T00:00:00Z");

        let serialized = value.to_string();
        for technical in ["onnx", "openrouter", "threshold", "Case:"] {
            assert!(!serialized.contains(technical));
        }
    }

    #[test]
    fn spoiler_preview_truncates_and_escapes_untrusted_markdown() {
        let preview = spoiler_preview(&format!("start || `code` {}", "x".repeat(800)));
        assert!(preview.starts_with("||"));
        assert!(preview.ends_with("…||"));
        assert!(preview.contains(r"\|\|"));
        assert!(preview.contains(r"\`code\`"));
        assert!(preview.chars().count() < 750);
        assert_eq!(spoiler_preview("  "), "||_No message text_||");
    }

    #[test]
    fn ban_failure_requests_review_without_exposing_technical_detail() {
        let embed = build_alert_embed(
            &EvidenceMeta::default(),
            &super::Enforcement::BanFailed("missing BAN_MEMBERS".into()),
        );
        let value = serde_json::to_value(embed).expect("embed serializes");
        assert_eq!(
            embed_field(&value, "Action"),
            "Ban failed — moderator action required"
        );
        assert!(!value.to_string().contains("BAN_MEMBERS"));
    }

    fn embed_field<'a>(embed: &'a serde_json::Value, name: &str) -> &'a str {
        embed["fields"]
            .as_array()
            .expect("fields")
            .iter()
            .find(|field| field["name"] == name)
            .and_then(|field| field["value"].as_str())
            .expect("named field")
    }

    fn temp_evidence_dir(name: &str) -> std::path::PathBuf {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let dir = std::env::temp_dir().join(format!(
            "evidence-{name}-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("mkdir");
        dir
    }

    async fn test_body(url: &str) -> reqwest::Response {
        let client = reqwest::Client::builder().build().expect("client");
        client.get(url).send().await.expect("fetch")
    }

    #[tokio::test]
    async fn stream_writes_full_body_under_cap() {
        let server = MockServer::spawn_ok(vec![b'A'; 128]).await;
        let response = test_body(&server.url()).await;
        let dir = temp_evidence_dir("evidence-stream-ok");
        let path = dir.join("one.bin");

        let written = try_to_file(response, &path, 1024).await.expect("stream");
        assert_eq!(written, 128);
        let bytes = std::fs::read(&path).expect("read");
        assert_eq!(bytes.len(), 128);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn stream_rejects_oversized_body_and_cleans_partial_file() {
        let server = MockServer::spawn_ok(b"A".repeat(8192).to_vec()).await;
        let response = test_body(&server.url()).await;
        let dir = temp_evidence_dir("evidence-stream-cap");
        let path = dir.join("big.bin");

        let error = super::try_to_file(response, &path, 256)
            .await
            .expect_err("must reject oversized body");
        assert!(error.contains("cap"));
        assert!(!path.exists(), "partial file must be removed");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn stream_failure_does_not_delete_preexisting_file() {
        let server = MockServer::spawn_ok([b'A'; 16].to_vec()).await;
        let response = test_body(&server.url()).await;
        let dir = temp_evidence_dir("evidence-stream-existing");
        let path = dir.join("existing.bin");
        std::fs::write(&path, b"keep").expect("seed pre-existing file");

        // `create_new` on an existing path must fail without arming a guard
        // that would delete the pre-existing file.
        let error = super::try_to_file(response, &path, 1024)
            .await
            .expect_err("create_new must fail");
        assert!(error.contains("cannot create evidence file"));
        assert_eq!(
            std::fs::read(&path).expect("read existing file"),
            b"keep",
            "pre-existing file must survive"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn download_all_rejects_non_cdn_url_before_network() {
        let storage = EvidenceStorage::create(
            std::env::temp_dir().join(format!("evidence-test-cdn-{}", std::process::id())),
            None,
        )
        .expect("storage");
        let image = image(
            "https://evil.example/a.png",
            "a.png",
            Some("image/png"),
            Some(64),
        );
        let (ready, failures) = storage.download_all("case/1", &[image], 256, 1024).await;
        assert!(ready.is_empty());
        assert!(
            failures[0].contains("Discord CDN"),
            "failure must cite allowlist, got {failures:?}"
        );
    }

    #[tokio::test]
    async fn download_all_rejects_declared_oversize() {
        let storage = EvidenceStorage::create(
            std::env::temp_dir().join(format!("evidence-test-size-{}", std::process::id())),
            None,
        )
        .expect("storage");
        let image = image(
            "https://cdn.discordapp.com/attachments/1/2/big.png",
            "big.png",
            Some("image/png"),
            Some(2_000),
        );
        let (ready, failures) = storage.download_all("case 1", &[image], 256, 1024).await;
        assert!(ready.is_empty());
        assert!(
            failures[0].contains("cap"),
            "declared size must be capped, got {failures:?}"
        );
    }

    #[test]
    fn cumulative_cap_plan_skips_remaining_attachments() {
        let first = image(
            "https://cdn.discordapp.com/attachments/1/2/a.png",
            "a.png",
            Some("image/png"),
            Some(80),
        );
        let second = image(
            "https://cdn.discordapp.com/attachments/1/2/b.png",
            "b.png",
            Some("image/png"),
            Some(80),
        );
        let third = image(
            "https://cdn.discordapp.com/attachments/1/2/c.png",
            "c.png",
            Some("image/png"),
            Some(80),
        );
        // Per-file cap allows each; the cumulative cap of 100 admits only
        // the first attachment and skips the rest.
        let plan = EvidenceStorage::cumulative_cap_plan(
            &[first.clone(), second.clone(), third.clone()],
            100,
        );
        assert_eq!(plan, vec![true, false, false]);

        // A cap large enough for everything admits all.
        let plan = EvidenceStorage::cumulative_cap_plan(&[first, second, third], 240);
        assert_eq!(plan, vec![true, true, true]);
    }

    #[test]
    fn create_private_returns_unique_private_directories() {
        let first = EvidenceStorage::create_private().expect("first");
        let second = EvidenceStorage::create_private().expect("second");
        assert_ne!(
            first.root().display().to_string(),
            second.root().display().to_string()
        );

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = first
                .root()
                .metadata()
                .expect("metadata")
                .permissions()
                .mode()
                & 0o777;
            assert_eq!(mode, 0o700, "evidence root must be private");
        }
    }

    #[test]
    fn drop_removes_private_root_on_normal_shutdown() {
        let root = {
            let storage = EvidenceStorage::create_private().expect("storage");
            let root = storage.root().to_path_buf();
            assert!(root.exists(), "root exists while storage is alive");
            root
        };
        assert!(
            !root.exists(),
            "private root must be removed recursively when storage drops"
        );
    }

    #[test]
    fn stale_private_roots_are_swept_but_recent_and_unrelated_survive() {
        let scan = temp_evidence_dir("evidence-stale-scan");
        let stale = scan.join("discord-bot-spam-evidence-old");
        let recent = scan.join("discord-bot-spam-evidence-new");
        let unrelated = scan.join("unrelated-temp-path");
        let stray_file = scan.join("discord-bot-spam-evidence-file");
        std::fs::create_dir(&stale).expect("stale dir");
        std::fs::create_dir(&recent).expect("recent dir");
        std::fs::create_dir(&unrelated).expect("unrelated dir");
        std::fs::write(&stray_file, b"x").expect("stray file");
        let now = std::time::SystemTime::now();

        // A cutoff in the future marks every matching directory stale, so
        // each matching root is removed while unrelated paths and stray
        // files survive.
        let future = now
            .checked_add(std::time::Duration::from_secs(3600))
            .expect("future");
        super::sweep_stale_private_roots(&scan, future).expect("sweep");
        assert!(!stale.exists(), "stale matching root must be removed");
        assert!(
            !recent.exists(),
            "matching root older than cutoff must be removed"
        );
        assert!(unrelated.exists(), "unrelated path must survive");
        assert!(
            stray_file.exists(),
            "non-directory matching entry must survive"
        );

        // A cutoff in the past leaves matching directories untouched.
        let past = now
            .checked_sub(std::time::Duration::from_secs(3600))
            .expect("past");
        let fresh = scan.join("discord-bot-spam-evidence-fresh");
        std::fs::create_dir(&fresh).expect("fresh dir");
        super::sweep_stale_private_roots(&scan, past).expect("sweep");
        assert!(
            fresh.exists(),
            "recent matching root must survive with a past cutoff"
        );
    }

    #[cfg(unix)]
    #[test]
    fn create_rejects_symlink_root() {
        let target = temp_evidence_dir("evidence-symlink-target");
        let link = temp_evidence_dir("evidence-symlink-link").join("evil");
        std::os::unix::fs::symlink(&target, &link).expect("create symlink");

        let result = EvidenceStorage::create(link.clone(), None);
        assert!(result.is_err(), "symlink root must be rejected");
        assert!(
            result
                .err()
                .map(|e| e.to_string())
                .unwrap_or_default()
                .contains("symlink"),
            "failure must cite symlink"
        );
        let _ = std::fs::remove_dir_all(link.parent().expect("parent"));
        let _ = std::fs::remove_dir_all(&target);
    }

    #[test]
    fn create_rejects_non_directory_root() {
        let dir = temp_evidence_dir("evidence-file-root");
        let file = dir.join("not-a-dir");
        std::fs::write(&file, b"x").expect("seed file");
        let error = EvidenceStorage::create(file.clone(), None);
        assert!(error.is_err(), "file root must be rejected");
        assert!(
            error
                .err()
                .map(|e| e.to_string())
                .unwrap_or_default()
                .contains("not a directory"),
            "failure must cite directory requirement"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn case_directory_is_removed_when_last_image_drops() {
        let storage = EvidenceStorage::create(
            std::env::temp_dir().join(format!("evidence-lifecycle-{}", std::process::id())),
            None,
        )
        .expect("storage");
        let case_dir = storage.root().join("case12");
        let file = case_dir.join("evidence.png");
        std::fs::create_dir_all(&case_dir).expect("create case dir");
        std::fs::write(&file, b"bytes").expect("seed image");

        {
            // The guard is moved into the second image; no extra strong
            // reference survives the block, so dropping the last image
            // removes the directory.
            let guard = std::sync::Arc::new(super::CaseDirGuard::new(case_dir.clone()));
            let first = super::StoredImage::new(file.clone(), "a.png".to_string(), guard.clone());
            let second = super::StoredImage::new(file.clone(), "b.png".to_string(), guard);
            assert!(case_dir.exists(), "case dir must exist while images live");
            drop(first);
            assert!(case_dir.exists(), "second image keeps the dir alive");
            drop(second);
        }
        assert!(
            !case_dir.exists(),
            "case directory must be removed when the last image drops"
        );
    }

    #[test]
    fn failure_only_case_directory_is_removed() {
        let root = temp_evidence_dir("evidence-fail-dir");
        let storage = EvidenceStorage::create(root.clone(), None).expect("storage");
        // An unsupported attachment fails validation before any download;
        // the case directory must not survive the failed run.
        let bad = image(
            "https://evil.example/a.png",
            "a.png",
            Some("image/png"),
            Some(64),
        );

        let runtime = tokio::runtime::Runtime::new().expect("runtime");
        let (ready, failures) = runtime.block_on(storage.download_all("case9", &[bad], 256, 1024));
        assert!(ready.is_empty());
        assert!(!failures.is_empty());
        assert!(
            !storage.root().join("case9").exists(),
            "failure-only case directory must be cleaned up"
        );
    }
}
