//! Spam pipeline orchestration for the Discord gateway.
//!
//! One dispatcher drains a bounded queue under a global in-flight permit
//! (saturation fails open). Same-author events run FIFO through per-author
//! completion chains ([`AuthorTails`]/[`TurnGuard`]), cancellation- and
//! panic-safe; unrelated authors never block each other. Every dependency
//! failure is `Indeterminate` (fail open).

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use poise::serenity_prelude as serenity;
use serenity::model::channel::{Attachment, Channel, Message, MessageType};
use serenity::model::id::{ChannelId, GuildId, MessageId, UserId};
use tokio::sync::mpsc::error::TrySendError;
use tokio::sync::{Notify, OwnedSemaphorePermit, Semaphore, mpsc};

use crate::Error;
use crate::alm::api::client::Client;
use crate::config::SpamDetectionMode;
use crate::discord::spam::evidence::{
    AlertReporter, Enforcement, EvidenceMeta, EvidenceStorage, build_alert_embed, case_id,
};
use crate::discord::spam::moderation::ban_user_with_cleanup;
use crate::discord::spam::onnx::{OnnxClassifier, OnnxVerdict};
use crate::discord::spam::openrouter::{IMAGE_EXTENSIONS, OpenRouterClassifier, OpenRouterResult};
use crate::discord::spam::{Classified, ClassifierDiagnostics, ImageRef, Verdict};

pub(crate) const CREDIT_DEDUP_TTL: Duration = Duration::from_secs(3600);
pub(crate) const CREDIT_DEDUP_MAX: usize = 10_000;
pub(crate) const FINGERPRINT_DEDUP_TTL: Duration = Duration::from_secs(600);
pub(crate) const FINGERPRINT_DEDUP_MAX: usize = 10_000;

/// Discord allows at most 10 attachments per message; the per-case evidence
/// byte cap derives from this.
pub(crate) const MAX_DISCORD_ATTACHMENTS: u64 = 10;

pub(crate) fn in_flight_limit(onnx_concurrency: usize, openrouter_concurrency: usize) -> usize {
    (onnx_concurrency + openrouter_concurrency).max(1)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WorkKind {
    Create,
    Edit,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum MessageKind {
    #[default]
    Regular,
    Unsupported,
}

/// Normalized message used by the pipeline, extracted in the gateway handler
/// so the rest of the module stays testable without a live Discord.
#[derive(Clone, Debug, Default)]
pub struct MessageSnapshot {
    pub message_id: MessageId,
    pub channel_id: ChannelId,
    pub guild_id: Option<GuildId>,
    pub author_id: UserId,
    pub author_name: String,
    pub author_bot: bool,
    pub author_system: bool,
    pub webhook_id: Option<u64>,
    pub kind: MessageKind,
    pub content: String,
    pub attachments: Vec<ImageRef>,
    pub timestamp: Option<String>,
}

impl MessageSnapshot {
    pub fn from_message(message: &Message) -> Self {
        let kind = match message.kind {
            MessageType::Regular | MessageType::InlineReply => MessageKind::Regular,
            _ => MessageKind::Unsupported,
        };
        Self {
            message_id: message.id,
            channel_id: message.channel_id,
            guild_id: message.guild_id,
            author_id: message.author.id,
            author_name: message
                .author
                .global_name
                .clone()
                .unwrap_or_else(|| message.author.name.clone()),
            author_bot: message.author.bot,
            author_system: message.author.system,
            webhook_id: message.webhook_id.map(|id| id.get()),
            kind,
            content: message.content.clone(),
            attachments: message
                .attachments
                .iter()
                .map(ImageRef::from_attachment)
                .collect(),
            timestamp: Some(message.timestamp.to_string()),
        }
    }

    /// Stable identity. Fields are length-prefixed and attachments contribute
    /// full metadata, so content can never be conflated with an attachment -
    /// even when the text itself contains a matching CDN URL.
    pub fn fingerprint(&self) -> String {
        let mut out = String::new();
        push_fingerprint_field(&mut out, &self.content);

        let mut attachments: Vec<String> = self
            .attachments
            .iter()
            .map(attachment_fingerprint)
            .collect();
        attachments.sort();

        push_fingerprint_field(&mut out, &attachments.len().to_string());
        for attachment in &attachments {
            push_fingerprint_field(&mut out, attachment);
        }
        out
    }

    /// Real image candidates. Unsupported/oversized forms stay: OpenRouter
    /// must report them as indeterminate, never silently skip them.
    pub fn image_attachments(&self) -> Vec<ImageRef> {
        self.attachments
            .iter()
            .filter(|image| is_image_attachment(image))
            .cloned()
            .collect()
    }
}

/// `image/*` MIME, non-zero dimensions, or a known image extension.
/// A spoofed image-looking extension still reaches strict validation and
/// fails open downstream.
fn is_image_attachment(image: &ImageRef) -> bool {
    if image
        .content_type
        .as_deref()
        .is_some_and(|ct| ct.to_ascii_lowercase().starts_with("image/"))
    {
        return true;
    }
    if image.width.is_some_and(|width| width > 0) || image.height.is_some_and(|height| height > 0) {
        return true;
    }
    let extension = image
        .filename
        .rsplit('.')
        .next()
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    IMAGE_EXTENSIONS.contains(&extension.as_str())
}

impl ImageRef {
    fn from_attachment(attachment: &Attachment) -> Self {
        Self {
            url: attachment.url.clone(),
            filename: attachment.filename.clone(),
            content_type: attachment.content_type.clone(),
            declared_size: Some(u64::from(attachment.size)),
            width: attachment.width,
            height: attachment.height,
        }
    }
}

fn push_fingerprint_field(out: &mut String, value: &str) {
    out.push_str(&value.len().to_string());
    out.push(':');
    out.push_str(value);
}

fn attachment_fingerprint(attachment: &ImageRef) -> String {
    let mut field = String::new();
    push_fingerprint_field(&mut field, &attachment.url);
    push_fingerprint_field(&mut field, &attachment.filename);
    push_fingerprint_field(&mut field, attachment.content_type.as_deref().unwrap_or(""));
    push_fingerprint_field(
        &mut field,
        &attachment
            .declared_size
            .map(|size| size.to_string())
            .unwrap_or_default(),
    );
    push_fingerprint_field(
        &mut field,
        &attachment.width.map(|w| w.to_string()).unwrap_or_default(),
    );
    push_fingerprint_field(
        &mut field,
        &attachment.height.map(|h| h.to_string()).unwrap_or_default(),
    );
    field
}

#[derive(Clone, Debug)]
pub enum QueuedEvent {
    Create(Box<MessageSnapshot>),
    Edit(EditWork),
}

/// The update event's author hint keeps same-author ordering while the
/// authoritative snapshot is fetched inside the chain slot.
#[derive(Clone, Debug)]
pub struct EditWork {
    pub message_id: MessageId,
    pub channel_id: ChannelId,
    pub author_hint: Option<u64>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EnqueueError {
    Full,
    Closed,
}

/// Enqueueing never blocks the Serenity dispatch loop.
pub struct SpamService {
    tx: mpsc::Sender<QueuedEvent>,
    pipeline: Arc<Pipeline>,
}

impl SpamService {
    pub fn new(pipeline: Arc<Pipeline>, queue_capacity: usize) -> Self {
        let (tx, rx) = mpsc::channel(queue_capacity.max(1));
        tokio::spawn(dispatch_loop(rx, pipeline.clone()));
        Self { tx, pipeline }
    }

    /// `Err(Full)` = queue saturated (message skipped and error logged).
    pub fn enqueue(&self, event: QueuedEvent) -> Result<(), EnqueueError> {
        match self.tx.try_send(event) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => {
                self.pipeline
                    .report_error("queue-full", "spam queue is full; failing open");
                Err(EnqueueError::Full)
            }
            Err(TrySendError::Closed(_)) => Err(EnqueueError::Closed),
        }
    }
}

pub struct Pipeline {
    pub mode: SpamDetectionMode,
    pub guild_id: GuildId,
    pub moderation_channel_id: ChannelId,
    pub ban_delete_message_seconds: u64,
    pub onnx: Arc<OnnxClassifier>,
    pub onnx_semaphore: Arc<Semaphore>,
    pub onnx_concurrency: usize,
    pub classifier: Arc<OpenRouterClassifier>,
    pub classifier_semaphore: Arc<Semaphore>,
    pub classifier_concurrency: usize,
    pub evidence: Arc<EvidenceStorage>,
    /// Held from image download through ban/report and `StoredImage` drops:
    /// one case at a time bounds temp-disk usage end-to-end.
    pub evidence_semaphore: Arc<Semaphore>,
    pub reporter: Arc<AlertReporter>,
    pub ctx: Arc<serenity::Context>,
    pub max_image_bytes: u64,
    pub(crate) fingerprint_dedup: FingerprintDedup,
    pub(crate) credit_dedup: CreditDedup,
}

impl Pipeline {
    /// Derived cap for the global in-flight permit used by the dispatcher.
    pub(crate) fn in_flight_limit(&self) -> usize {
        in_flight_limit(self.onnx_concurrency, self.classifier_concurrency)
    }

    /// Operational failures stay in application logs; moderator channel only
    /// receives confirmed spam alerts.
    fn report_error(&self, key: &'static str, detail: impl AsRef<str>) {
        tracing::error!(
            error_key = key,
            detail = detail.as_ref(),
            "spam detection failure"
        );
    }
}

/// Per-author completion chains: `reserve` mints `(previous, next)` tickets
/// in FIFO receive order; each worker awaits `previous` and fires `next`.
pub(crate) struct AuthorTails {
    inner: Mutex<HashMap<u64, Arc<Notify>>>,
}

impl AuthorTails {
    pub(crate) fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    fn reserve(&self, key: u64) -> (Option<Arc<Notify>>, Arc<Notify>) {
        let mut inner = self.inner.lock().expect("author tails lock");
        // Finished chains hold the only strong reference to their ticket.
        inner.retain(|_, tail| Arc::strong_count(tail) > 1);
        let previous = inner.remove(&key);
        let next = Arc::new(Notify::new());
        inner.insert(key, next.clone());
        (previous, next)
    }
}

/// Dedup: identical snapshot per message processed once per TTL.
pub(crate) struct FingerprintDedup {
    entries: Mutex<HashMap<u64, (String, Instant)>>,
    ttl: Duration,
    max: usize,
}

impl FingerprintDedup {
    pub(crate) fn new(ttl: Duration, max: usize) -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            ttl,
            max,
        }
    }

    fn claim(&self, message_id: u64, fingerprint: &str, now: Instant) -> bool {
        let mut entries = self.entries.lock().expect("fingerprint dedup lock");
        entries.retain(|_, (_, touched)| now.duration_since(*touched) < self.ttl);
        if let Some((previous, _)) = entries.get(&message_id)
            && previous == fingerprint
        {
            return false;
        }
        if entries.len() >= self.max
            && let Some(oldest) = entries
                .iter()
                .min_by_key(|(_, (_, touched))| *touched)
                .map(|(id, _)| *id)
        {
            entries.remove(&oldest);
        }
        entries.insert(message_id, (fingerprint.to_string(), now));
        true
    }
}

/// One create event credited once per TTL.
pub(crate) struct CreditDedup {
    entries: Mutex<HashMap<u64, Instant>>,
    ttl: Duration,
    max: usize,
}

impl CreditDedup {
    pub(crate) fn new(ttl: Duration, max: usize) -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            ttl,
            max,
        }
    }

    fn claim(&self, message_id: u64, now: Instant) -> bool {
        let mut entries = self.entries.lock().expect("credit dedup lock");
        entries.retain(|_, touched| now.duration_since(*touched) < self.ttl);
        if entries.contains_key(&message_id) {
            return false;
        }
        if entries.len() >= self.max
            && let Some(oldest) = entries
                .iter()
                .min_by_key(|(_, touched)| **touched)
                .map(|(id, _)| *id)
        {
            entries.remove(&oldest);
        }
        entries.insert(message_id, now);
        true
    }
}

/// One link of a per-author turn chain. Drop is cancellation- and
/// panic-safe: a turn holder always releases its successor; a cancelled or
/// panicked waiter forwards the predecessor's completion to its successor
/// instead of skipping it or deadlocking the chain.
pub(crate) struct TurnGuard {
    prev: Option<Arc<Notify>>,
    next: Option<Arc<Notify>>,
    /// No predecessor, or the predecessor's ticket already fired.
    acquired: bool,
}

impl TurnGuard {
    pub(crate) fn new(prev: Option<Arc<Notify>>, next: Arc<Notify>) -> Self {
        Self {
            acquired: prev.is_none(),
            prev,
            next: Some(next),
        }
    }

    pub(crate) async fn await_turn(&mut self) {
        if self.acquired {
            return;
        }
        let prev = self
            .prev
            .as_ref()
            .expect("prev exists until acquired")
            .clone();
        prev.notified().await;
        self.acquired = true;
    }
}

impl Drop for TurnGuard {
    fn drop(&mut self) {
        let Some(next) = self.next.take() else {
            return;
        };
        if self.acquired {
            next.notify_one();
            return;
        }
        // Cancelled/panicked waiter: keep the successor blocked until the
        // predecessor actually completes.
        if let Some(prev) = self.prev.take()
            && let Ok(runtime) = tokio::runtime::Handle::try_current()
        {
            runtime.spawn(async move {
                prev.notified().await;
                next.notify_one();
            });
        } else {
            tracing::error!(
                "spam turn chain: forwarding cancelled waiter without a tokio runtime; successor may stall"
            );
        }
    }
}

async fn dispatch_loop(mut rx: mpsc::Receiver<QueuedEvent>, pipeline: Arc<Pipeline>) {
    let in_flight = Arc::new(Semaphore::new(pipeline.in_flight_limit()));
    let tails = Arc::new(AuthorTails::new());

    while let Some(event) = rx.recv().await {
        // While saturated, hold a permit so the queue backpressures and
        // new enqueues fail open with an error log.
        let permit = match in_flight.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => return,
        };
        let tails = tails.clone();
        let pipeline = pipeline.clone();

        match event {
            QueuedEvent::Create(snapshot) => {
                let author = snapshot.author_id.get();
                let (previous, next) = tails.reserve(author);
                tokio::spawn(async move {
                    let mut turn = TurnGuard::new(previous, next);
                    turn.await_turn().await;
                    let result =
                        process_message(WorkKind::Create, &snapshot, pipeline.as_ref()).await;
                    drop(permit);
                    drop(turn);
                    if let Err(error) = result {
                        tracing::error!("spam pipeline event failed: {error}");
                    }
                });
            }
            QueuedEvent::Edit(edit) => match edit.author_hint {
                // Trusted hint orders the event by author now; a fresh
                // snapshot that disagrees with it fails open.
                Some(hint) => {
                    let (previous, next) = tails.reserve(hint);
                    tokio::spawn(async move {
                        let mut turn = TurnGuard::new(previous, next);
                        turn.await_turn().await;
                        run_edit_chained(pipeline.as_ref(), edit, hint).await;
                        drop(permit);
                        drop(turn);
                    });
                }
                None => {
                    // Resolve before assigning the ordering ticket
                    // (dispatcher's only network path).
                    let snapshot = match fetch_edit_snapshot(
                        &pipeline,
                        edit.channel_id,
                        edit.message_id,
                    )
                    .await
                    {
                        EditFetchOutcome::Snapshot(snapshot) => snapshot,
                        EditFetchOutcome::Deleted => {
                            drop(permit);
                            continue;
                        }
                        EditFetchOutcome::Unavailable(detail) => {
                            pipeline.report_error(
                                    "discord-fetch",
                                    format!(
                                        "edit fetch failed (no author hint) channel={} message={}: {detail}",
                                        edit.channel_id.get(),
                                        edit.message_id.get()
                                    ),
                                );
                            drop(permit);
                            continue;
                        }
                    };
                    let author = snapshot.author_id.get();
                    let (previous, next) = tails.reserve(author);
                    tokio::spawn(async move {
                        let mut turn = TurnGuard::new(previous, next);
                        turn.await_turn().await;
                        let result =
                            process_message(WorkKind::Edit, &snapshot, pipeline.as_ref()).await;
                        drop(permit);
                        drop(turn);
                        if let Err(error) = result {
                            tracing::error!("spam pipeline event failed: {error}");
                        }
                    });
                }
            },
        }
    }
    tracing::debug!("spam dispatch loop ended");
}

enum EditFetchOutcome {
    Snapshot(MessageSnapshot),
    Deleted,
    Unavailable(String),
}

/// Distinguishes a genuinely deleted message (404) from an outage.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FetchErrorKind {
    /// 404: the message does not exist anymore.
    NotFound,
    /// Anything else: transport error, non-404 HTTP status.
    Other,
}

pub fn classify_fetch_status(status: Option<u16>) -> FetchErrorKind {
    match status {
        Some(404) => FetchErrorKind::NotFound,
        _ => FetchErrorKind::Other,
    }
}

fn fetch_status(error: &serenity::Error) -> Option<u16> {
    match error {
        serenity::Error::Http(http) => http.status_code().map(|code| code.as_u16()),
        _ => None,
    }
}

/// 404 -> Deleted (skipped); anything else -> unavailable.
async fn fetch_edit_snapshot(
    pipeline: &Pipeline,
    channel_id: ChannelId,
    message_id: MessageId,
) -> EditFetchOutcome {
    match pipeline.ctx.http.get_message(channel_id, message_id).await {
        Ok(message) => EditFetchOutcome::Snapshot(MessageSnapshot::from_message(&message)),
        Err(error) => match classify_fetch_status(fetch_status(&error)) {
            FetchErrorKind::NotFound => EditFetchOutcome::Deleted,
            FetchErrorKind::Other => EditFetchOutcome::Unavailable(error.to_string()),
        },
    }
}

/// A fetched snapshot that disagrees with the hint fails open (warn + skip).
async fn run_edit_chained(pipeline: &Pipeline, edit: EditWork, hint: u64) {
    let snapshot = match fetch_edit_snapshot(pipeline, edit.channel_id, edit.message_id).await {
        EditFetchOutcome::Snapshot(snapshot) => snapshot,
        EditFetchOutcome::Deleted => {
            tracing::debug!(
                "spam edit: message deleted channel={} message={}",
                edit.channel_id.get(),
                edit.message_id.get()
            );
            return;
        }
        EditFetchOutcome::Unavailable(detail) => {
            pipeline.report_error(
                "discord-fetch",
                format!(
                    "edit fetch failed channel={} message={}: {detail}",
                    edit.channel_id.get(),
                    edit.message_id.get()
                ),
            );
            return;
        }
    };

    if snapshot.author_id.get() != hint {
        pipeline.report_error(
            "edit-author-mismatch",
            format!(
                "edit author differs from ordered hint: hint={} actual={} channel={} message={} (skipping, fail open)",
                hint,
                snapshot.author_id.get(),
                edit.channel_id.get(),
                edit.message_id.get()
            ),
        );
        return;
    }

    if let Err(error) = process_message(WorkKind::Edit, &snapshot, pipeline).await {
        tracing::error!("spam pipeline event failed: {error}");
    }
}

enum ChannelParent {
    Resolved(Option<ChannelId>),
    Unresolved,
}

async fn resolve_channel_parent(pipeline: &Pipeline, channel_id: ChannelId) -> ChannelParent {
    let cached = pipeline
        .ctx
        .cache
        .guild(pipeline.guild_id)
        .and_then(|guild| {
            guild
                .channels
                .get(&channel_id)
                .or_else(|| guild.threads.iter().find(|thread| thread.id == channel_id))
                .cloned()
        });
    if let Some(guild_channel) = cached {
        return ChannelParent::Resolved(guild_channel.parent_id);
    }

    match pipeline.ctx.http.get_channel(channel_id).await {
        Ok(Channel::Guild(guild_channel)) => ChannelParent::Resolved(guild_channel.parent_id),
        Ok(_) => ChannelParent::Resolved(None),
        Err(error) => {
            tracing::debug!(
                "spam channel parent lookup failed channel={}: {error}",
                channel_id.get()
            );
            ChannelParent::Unresolved
        }
    }
}

async fn process_message(
    kind: WorkKind,
    snapshot: &MessageSnapshot,
    pipeline: &Pipeline,
) -> Result<(), Error> {
    // Unresolved parent (possibly a moderation thread) fails open.
    let parent = match resolve_channel_parent(pipeline, snapshot.channel_id).await {
        ChannelParent::Resolved(parent) => parent,
        ChannelParent::Unresolved => {
            pipeline.report_error(
                "moderation-channel",
                format!(
                    "could not resolve parent of channel={}; skipping message (fail open)",
                    snapshot.channel_id.get()
                ),
            );
            return Ok(());
        }
    };

    if !snapshot_is_eligible(
        snapshot,
        pipeline.guild_id,
        pipeline.moderation_channel_id,
        parent,
    ) {
        return Ok(());
    }

    // Unsupported/oversized candidates stay: their validation failure is
    // indeterminate (fail open), never a silent skip.
    let images = snapshot.image_attachments();

    if snapshot.content.trim().is_empty() && images.is_empty() {
        return Ok(());
    }

    // Same fingerprint in TTL (replay or same-content edit): skip everything.
    if !pipeline.fingerprint_dedup.claim(
        snapshot.message_id.get(),
        &snapshot.fingerprint(),
        Instant::now(),
    ) {
        tracing::info!(
            "spam stage=dedup kind={kind:?} guild={} channel={} message={} user={} result=duplicate-fingerprint",
            pipeline.guild_id.get(),
            snapshot.channel_id.get(),
            snapshot.message_id.get(),
            snapshot.author_id.get()
        );
        return Ok(());
    }

    // Verified senders bypass all classifiers; API failure fails open.
    match Client::is_discord_verified(snapshot.author_id.get()).await {
        Ok(true) => {
            tracing::info!(
                "spam stage=verified user={} result=bypass",
                snapshot.author_id.get()
            );
            return Ok(());
        }
        Ok(false) => {}
        Err(error) => {
            pipeline.report_error(
                "internal-api",
                format!(
                    "verification check failed for user={}: {error}",
                    snapshot.author_id.get()
                ),
            );
            return Ok(());
        }
    }

    let classification_started = Instant::now();
    let classified = classify_message(pipeline, &snapshot.content, &images).await;
    let classify_elapsed = classification_started.elapsed();

    // Discard results for messages that changed/deleted while classifiers
    // ran; a non-404 fetch outage is never a deletion.
    match current_message_status(pipeline, snapshot).await {
        CurrentMessageStatus::Matches => {}
        CurrentMessageStatus::Stale => {
            tracing::info!(
                "spam stage=refetch guild={} channel={} message={} result=stale",
                pipeline.guild_id.get(),
                snapshot.channel_id.get(),
                snapshot.message_id.get()
            );
            return Ok(());
        }
        CurrentMessageStatus::Unavailable(detail) => {
            pipeline.report_error(
                "discord-fetch",
                format!(
                    "stale-check fetch failed guild={} channel={} message={}: {detail}",
                    pipeline.guild_id.get(),
                    snapshot.channel_id.get(),
                    snapshot.message_id.get()
                ),
            );
            return Ok(());
        }
    }

    // Structured diagnostics only: no raw content or secrets.
    let diagnostics = &classified.diagnostics;
    let onnx_detail = diagnostics
        .onnx
        .as_ref()
        .map(|onnx| {
            format!(
                "onnx_model={} onnx_version={} onnx_probability={:.4} onnx_threshold={}",
                onnx.model, onnx.version, onnx.spam_probability, onnx.spam_threshold
            )
        })
        .unwrap_or_else(|| "onnx_model=none".to_string());
    let openrouter_model = diagnostics
        .openrouter
        .first()
        .map(|batch| batch.model.as_str())
        .unwrap_or("none");
    tracing::info!(
        "spam stage=classified event={kind:?} guild={} channel={} message={} user={} verdict={:?} classify_ms={} {} openrouter_model={} openrouter_batches={} failures={}",
        pipeline.guild_id.get(),
        snapshot.channel_id.get(),
        snapshot.message_id.get(),
        snapshot.author_id.get(),
        classified.verdict,
        classify_elapsed.as_millis(),
        onnx_detail,
        openrouter_model,
        diagnostics.openrouter.len(),
        diagnostics.failures.len(),
    );

    match classified.verdict {
        Verdict::Accepted => {
            if kind == WorkKind::Create
                && pipeline
                    .credit_dedup
                    .claim(snapshot.message_id.get(), Instant::now())
            {
                match Client::record_verified_message(snapshot.author_id.get()).await {
                    Ok(_) => tracing::info!(
                        "spam stage=credit user={} message={}",
                        snapshot.author_id.get(),
                        snapshot.message_id.get()
                    ),
                    Err(error) => pipeline.report_error(
                        "internal-api",
                        format!(
                            "verification credit failed for user={}: {error}",
                            snapshot.author_id.get()
                        ),
                    ),
                }
            } else {
                tracing::info!(
                    "spam stage=accepted kind={kind:?} user={} message={} (no credit)",
                    snapshot.author_id.get(),
                    snapshot.message_id.get()
                );
            }
        }
        Verdict::Spam => {
            moderate_spam(kind, snapshot, &images, pipeline).await?;
        }
        Verdict::Indeterminate => {
            if !classified.diagnostics.failures.is_empty() {
                pipeline.report_error(
                    "classifier",
                    format!(
                        "user={} message={} failures=[{}]",
                        snapshot.author_id.get(),
                        snapshot.message_id.get(),
                        classified.diagnostics.failures.join("; ")
                    ),
                );
            }
        }
    }
    Ok(())
}

async fn classify_message(pipeline: &Pipeline, text: &str, images: &[ImageRef]) -> Classified {
    let mut diagnostics = ClassifierDiagnostics::default();
    let verdict = if images.is_empty() {
        let outcome = onnx_infer(pipeline, text).await;
        match outcome {
            Ok(outcome) => {
                diagnostics.onnx = Some(outcome.diagnostic.clone());
                if matches!(outcome.verdict, OnnxVerdict::Escalate) {
                    classify_with_openrouter(pipeline, text, &[], &mut diagnostics).await
                } else {
                    Verdict::Accepted
                }
            }
            Err(error) => {
                diagnostics.failures.push(format!("onnx: {error}"));
                Verdict::Indeterminate
            }
        }
    } else {
        classify_with_openrouter(pipeline, text, images, &mut diagnostics).await
    };
    Classified {
        verdict,
        diagnostics,
    }
}

async fn acquire_owned_permit(semaphore: &Arc<Semaphore>) -> Option<OwnedSemaphorePermit> {
    semaphore.clone().acquire_owned().await.ok()
}

async fn onnx_infer(
    pipeline: &Pipeline,
    text: &str,
) -> Result<crate::discord::spam::onnx::OnnxOutcome, String> {
    let _permit = match pipeline.onnx_semaphore.clone().acquire_owned().await {
        Ok(permit) => permit,
        Err(_) => return Err("onnx concurrency semaphore closed".to_string()),
    };
    pipeline
        .onnx
        .classify(text)
        .await
        .map_err(|error| error.to_string())
}

async fn classify_with_openrouter(
    pipeline: &Pipeline,
    text: &str,
    images: &[ImageRef],
    diagnostics: &mut ClassifierDiagnostics,
) -> Verdict {
    let result = {
        let _permit = match pipeline.classifier_semaphore.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => {
                diagnostics
                    .failures
                    .push("OpenRouter classifier concurrency semaphore closed".to_string());
                return Verdict::Indeterminate;
            }
        };
        pipeline.classifier.classify_message(text, images).await
    };
    match result {
        OpenRouterResult::Spam { batches } => {
            diagnostics.openrouter.extend(batches);
            Verdict::Spam
        }
        OpenRouterResult::Accepted { batches } => {
            diagnostics.openrouter.extend(batches);
            Verdict::Accepted
        }
        OpenRouterResult::Indeterminate { batches, failures } => {
            diagnostics.openrouter.extend(batches);
            diagnostics.failures.extend(failures);
            Verdict::Indeterminate
        }
    }
}

/// Evidence, enforcement, report. Re-checks staleness after downloads and
/// before every action; ban mode re-checks verification right before the ban.
async fn moderate_spam(
    kind: WorkKind,
    snapshot: &MessageSnapshot,
    images: &[ImageRef],
    pipeline: &Pipeline,
) -> Result<(), Error> {
    let case = case_id(pipeline.guild_id.get(), snapshot.message_id.get());

    // One case at a time globally bounds temp disk (download -> ban -> drops).
    let Some(_evidence_permit) = acquire_owned_permit(&pipeline.evidence_semaphore).await else {
        pipeline.report_error(
            "evidence",
            format!("case {case}: evidence capacity exhausted; skipping moderation (fail open)"),
        );
        return Ok(());
    };

    // Staleness gate before any moderation side effect; an outage is not a
    // deletion.
    match current_message_status(pipeline, snapshot).await {
        CurrentMessageStatus::Matches => {}
        status => {
            abort_moderation_for_status(pipeline, snapshot, "pre-moderation", status);
            return Ok(());
        }
    }

    let (stored, download_failures) = pipeline
        .evidence
        .download_all(
            &case,
            images,
            pipeline.max_image_bytes,
            MAX_DISCORD_ATTACHMENTS * pipeline.max_image_bytes,
        )
        .await;
    for failure in &download_failures {
        tracing::error!(%failure, "spam evidence download failed");
    }

    // Re-check after the downloads; an outage fails open.
    match current_message_status(pipeline, snapshot).await {
        CurrentMessageStatus::Matches => {}
        status => {
            abort_moderation_for_status(pipeline, snapshot, "post-download", status);
            return Ok(());
        }
    }

    // Verified or unavailable API fails open (no ban, no alert).
    let can_ban = match pipeline.mode {
        SpamDetectionMode::Alert => false,
        SpamDetectionMode::Ban => match Client::is_discord_verified(snapshot.author_id.get()).await
        {
            Ok(false) => true,
            Ok(true) => {
                tracing::info!(
                    "spam stage=recheck user={} message={} result=became-verified",
                    snapshot.author_id.get(),
                    snapshot.message_id.get()
                );
                return Ok(());
            }
            Err(error) => {
                pipeline.report_error(
                    "internal-api",
                    format!("verification recheck failed: {error} (ban skipped)"),
                );
                false
            }
        },
    };

    let enforcement = if can_ban {
        // Final fingerprint refetch before the ban.
        match current_message_status(pipeline, snapshot).await {
            CurrentMessageStatus::Matches => {}
            status => {
                abort_moderation_for_status(pipeline, snapshot, "pre-ban", status);
                return Ok(());
            }
        }
        let reason = format!("GeoMeta spam moderation case {case}");
        match ban_user_with_cleanup(
            pipeline.ctx.http.as_ref(),
            pipeline.guild_id,
            snapshot.author_id,
            pipeline.ban_delete_message_seconds,
            &reason,
        )
        .await
        {
            Ok(_) => Enforcement::ConfirmedBan,
            Err(failure) => {
                tracing::error!(
                    user_id = snapshot.author_id.get(),
                    message_id = snapshot.message_id.get(),
                    failure_kind = ?failure.kind,
                    detail = %failure.detail,
                    "spam ban failed"
                );
                Enforcement::BanFailed(failure.detail)
            }
        }
    } else if pipeline.mode == SpamDetectionMode::Ban {
        Enforcement::NotApplied("verification recheck failed; ban skipped".to_string())
    } else {
        Enforcement::AlertOnly
    };

    let meta = EvidenceMeta {
        guild_id: pipeline.guild_id.get(),
        channel_id: snapshot.channel_id.get(),
        message_id: snapshot.message_id.get(),
        author_id: snapshot.author_id.get(),
        author_name: snapshot.author_name.clone(),
        channel_name: guild_channel(&pipeline.ctx, pipeline.guild_id, snapshot.channel_id)
            .map(|channel| channel.name.clone()),
        timestamp: snapshot.timestamp.clone(),
        content: snapshot.content.clone(),
        images: images.to_vec(),
    };

    let alert = build_alert_embed(&meta, &enforcement);
    let outcome = pipeline.reporter.report(alert, &stored).await;

    if let Some(error) = &outcome.post_error {
        tracing::error!("spam evidence post failed stage=report case={case} error={error}");
    }
    for error in &outcome.image_errors {
        tracing::error!(case, %error, "spam evidence image post failed");
    }
    tracing::info!(
        "spam event={kind:?} stage=message user={} channel={} message={} verdict=spam posts={}",
        snapshot.author_id.get(),
        snapshot.channel_id.get(),
        snapshot.message_id.get(),
        outcome.posts_sent
    );
    Ok(())
}

/// How the authoritative refetch compares to the classified snapshot.
pub(crate) enum CurrentMessageStatus {
    /// Same content/attachment fingerprint.
    Matches,
    /// Deleted or changed (404 or fingerprint drift).
    Stale,
    /// Operational failure (non-404 HTTP, transport); never a deletion.
    Unavailable(String),
}

fn abort_moderation_for_status(
    pipeline: &Pipeline,
    snapshot: &MessageSnapshot,
    stage: &str,
    status: CurrentMessageStatus,
) {
    match status {
        CurrentMessageStatus::Matches => {}
        CurrentMessageStatus::Stale => {
            tracing::info!(
                "spam stage={stage} guild={} channel={} message={} result=stale",
                pipeline.guild_id.get(),
                snapshot.channel_id.get(),
                snapshot.message_id.get()
            );
        }
        CurrentMessageStatus::Unavailable(detail) => {
            pipeline.report_error(
                "discord-fetch",
                format!(
                    "{stage} fetch failed guild={} channel={} message={}: {detail}",
                    pipeline.guild_id.get(),
                    snapshot.channel_id.get(),
                    snapshot.message_id.get()
                ),
            );
        }
    }
}

async fn current_message_status(
    pipeline: &Pipeline,
    snapshot: &MessageSnapshot,
) -> CurrentMessageStatus {
    match pipeline
        .ctx
        .http
        .get_message(snapshot.channel_id, snapshot.message_id)
        .await
    {
        Ok(current) => {
            if MessageSnapshot::from_message(&current).fingerprint() == snapshot.fingerprint() {
                CurrentMessageStatus::Matches
            } else {
                CurrentMessageStatus::Stale
            }
        }
        Err(error) => match classify_fetch_status(fetch_status(&error)) {
            FetchErrorKind::NotFound => CurrentMessageStatus::Stale,
            FetchErrorKind::Other => CurrentMessageStatus::Unavailable(error.to_string()),
        },
    }
}

pub fn snapshot_is_eligible(
    snapshot: &MessageSnapshot,
    guild_id: GuildId,
    moderation_channel_id: ChannelId,
    channel_parent: Option<ChannelId>,
) -> bool {
    if snapshot.guild_id != Some(guild_id) {
        return false;
    }
    if snapshot.author_bot || snapshot.author_system || snapshot.webhook_id.is_some() {
        return false;
    }
    if snapshot.kind != MessageKind::Regular {
        return false;
    }
    if snapshot.channel_id == moderation_channel_id || channel_parent == Some(moderation_channel_id)
    {
        return false;
    }
    !(snapshot.content.trim().is_empty() && snapshot.image_attachments().is_empty())
}

/// Naming is cosmetic and degrades to ids.
fn guild_channel(
    ctx: &serenity::Context,
    guild_id: GuildId,
    channel_id: ChannelId,
) -> Option<serenity::model::channel::GuildChannel> {
    let guild = ctx.cache.guild(guild_id)?;
    guild.channels.get(&channel_id).cloned().or_else(|| {
        guild
            .threads
            .iter()
            .find(|thread| thread.id == channel_id)
            .cloned()
    })
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::time::{Duration, Instant};

    use poise::serenity_prelude as serenity;
    use serenity::model::id::{ChannelId, GuildId, MessageId, UserId};

    use super::{
        AuthorTails, CreditDedup, CurrentMessageStatus, FetchErrorKind, FingerprintDedup,
        MessageKind, MessageSnapshot, TurnGuard, acquire_owned_permit, classify_fetch_status,
        in_flight_limit, is_image_attachment, snapshot_is_eligible,
    };
    use crate::discord::spam::ImageRef;
    use tokio::sync::Notify;

    fn snapshot() -> MessageSnapshot {
        MessageSnapshot {
            message_id: MessageId::new(1),
            channel_id: ChannelId::new(11),
            guild_id: Some(GuildId::new(100)),
            author_id: UserId::new(7),
            author_name: "test".into(),
            kind: MessageKind::Regular,
            content: "hello".into(),
            ..MessageSnapshot::default()
        }
    }

    fn image(name: &str) -> ImageRef {
        ImageRef {
            url: format!("https://cdn.discordapp.com/attachments/1/2/{name}"),
            filename: name.into(),
            content_type: Some("image/png".into()),
            declared_size: Some(10),
            width: Some(400),
            height: Some(300),
        }
    }

    #[tokio::test]
    async fn evidence_capacity_permit_serializes_cases() {
        use std::sync::atomic::{AtomicBool, Ordering};

        let capacity = Arc::new(tokio::sync::Semaphore::new(1));
        let held = Arc::new(tokio::sync::Notify::new());
        let release = Arc::new(tokio::sync::Notify::new());
        let second_started = Arc::new(AtomicBool::new(false));

        let first = {
            let capacity = capacity.clone();
            let held = held.clone();
            let release = release.clone();
            tokio::spawn(async move {
                let _permit = acquire_owned_permit(&capacity).await.expect("permit");
                held.notify_one();
                release.notified().await;
            })
        };
        // Wait until the first case actually holds the single permit.
        held.notified().await;

        let second = {
            let capacity = capacity.clone();
            let second_started = second_started.clone();
            tokio::spawn(async move {
                let _permit = acquire_owned_permit(&capacity).await.expect("permit");
                second_started.store(true, Ordering::SeqCst);
            })
        };

        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(
            !second_started.load(Ordering::SeqCst),
            "second case must wait for the first case permit"
        );
        release.notify_one();
        first.await.expect("first");
        second.await.expect("second");
        assert!(second_started.load(Ordering::SeqCst));
    }

    #[test]
    fn in_flight_limit_bounds_workers() {
        assert_eq!(in_flight_limit(4, 2), 6);
        assert_eq!(in_flight_limit(1, 1), 2);
        assert_eq!(in_flight_limit(0, 0), 1);
    }

    #[tokio::test]
    async fn image_candidates_include_unsupported_and_oversized_forms() {
        let mut snapshot = snapshot();
        snapshot.attachments = vec![
            image("good.png"),
            ImageRef {
                // unsupported image MIME: must remain a candidate
                url: "https://cdn.discordapp.com/attachments/1/2/tiff.tiff".into(),
                filename: "tiff.tiff".into(),
                content_type: Some("image/tiff".into()),
                declared_size: Some(50),
                width: None,
                height: None,
            },
            ImageRef {
                // image-looking extension with huge declared size: candidate
                url: "https://cdn.discordapp.com/attachments/1/2/big.png".into(),
                filename: "big.png".into(),
                content_type: Some("image/png".into()),
                declared_size: Some(500_000_000),
                width: Some(5000),
                height: Some(5000),
            },
        ];
        let candidates = snapshot.image_attachments();
        assert_eq!(candidates.len(), 3, "all image forms must be preserved");
    }

    #[test]
    fn non_image_attachments_are_not_candidates() {
        for (name, mime, width, height) in [
            ("archive.zip", Some("application/zip"), None, None),
            ("notes.txt", Some("text/plain"), None, None),
            ("audio.mp3", Some("audio/mpeg"), None, None),
        ] {
            let attachment = ImageRef {
                url: format!("https://cdn.discordapp.com/attachments/1/2/{name}"),
                filename: name.into(),
                content_type: mime.map(str::to_string),
                declared_size: Some(10),
                width,
                height,
            };
            assert!(
                !is_image_attachment(&attachment),
                "{name} must not be an image candidate"
            );
        }
    }

    #[test]
    fn dimension_only_attachment_is_image_candidate() {
        let attachment = ImageRef {
            url: "https://cdn.discordapp.com/attachments/1/2/x".into(),
            filename: "x".into(),
            content_type: None,
            declared_size: Some(10),
            width: Some(640),
            height: Some(480),
        };
        assert!(is_image_attachment(&attachment));
    }

    #[tokio::test]
    async fn author_chain_executes_in_receive_order_and_other_authors_proceed() {
        let tails = Arc::new(AuthorTails::new());
        let order = Arc::new(std::sync::Mutex::new(Vec::new()));
        // Gates the first author-1 event so the chain is provably occupied
        // while the second and third events are already queued.
        let gate = Arc::new(Notify::new());
        let gate_started = Arc::new(Notify::new());

        let spawn_one = |tails: Arc<AuthorTails>,
                         key: u64,
                         marker: u32,
                         order: Arc<std::sync::Mutex<Vec<u32>>>,
                         gate: Option<Arc<Notify>>,
                         started: Option<Arc<Notify>>|
         -> tokio::task::JoinHandle<()> {
            let (previous, next) = tails.reserve(key);
            tokio::spawn(async move {
                let mut turn = TurnGuard::new(previous, next);
                turn.await_turn().await;
                if let Some(started) = started {
                    started.notify_one();
                }
                if let Some(gate) = gate {
                    gate.notified().await;
                }
                order.lock().expect("order").push(marker);
                drop(turn);
            })
        };

        // Author 1, event 1: occupies the chain and blocks on the gate.
        let first = spawn_one(
            tails.clone(),
            7,
            1,
            order.clone(),
            Some(gate.clone()),
            Some(gate_started.clone()),
        );
        gate_started.notified().await;

        // Author 1, events 2 and 3, assigned while event 1 is still holding
        // the chain: they must execute strictly after event 1.
        let second = spawn_one(tails.clone(), 7, 2, order.clone(), None, None);
        let third = spawn_one(tails.clone(), 7, 3, order.clone(), None, None);

        // An unrelated author must not wait on author 1's chain.
        let other = spawn_one(tails.clone(), 8, 100, order.clone(), None, None);
        other.await.expect("other author");

        // Give concurrent tasks time to attempt mis-ordering; they must stay
        // blocked behind the held chain.
        tokio::time::sleep(Duration::from_millis(30)).await;
        let during = order.lock().expect("order").clone();
        assert!(
            !during.contains(&2),
            "second same-author event must not run early, got {during:?}"
        );

        gate.notify_one();
        first.await.expect("first");
        second.await.expect("second");
        third.await.expect("third");

        // b-blocked group aside, same-author events are strict FIFO: the
        // unrelated author ran while author 1 was still queued.
        let final_order = order.lock().expect("order").clone();
        for pair in [(1, 2), (2, 3)] {
            let a = final_order
                .iter()
                .position(|v| *v == pair.0)
                .expect("marker ran");
            let b = final_order
                .iter()
                .position(|v| *v == pair.1)
                .expect("marker ran");
            assert!(a < b, "author 1 order violated: {final_order:?}");
        }
    }

    #[test]
    fn author_tails_prune_finished_chains() {
        let tails = AuthorTails::new();
        // First reservation with no predecessor.
        let (previous, next) = tails.reserve(7);
        assert!(previous.is_none());

        // Simulate a finished chain: once the worker dropped its handle only
        // the map entry remains, so the next reservation drops it and the
        // author gets a fresh ticket with no predecessor to await.
        drop(next);
        let (previous, _) = tails.reserve(7);
        assert!(previous.is_none(), "finished chain must be pruned");
    }

    #[tokio::test]
    async fn cancelled_waiter_keeps_successor_blocked_until_predecessor_finishes() {
        let tails = Arc::new(AuthorTails::new());
        let order = Arc::new(std::sync::Mutex::new(Vec::new()));
        let a_acquired = Arc::new(Notify::new());
        let release_a = Arc::new(Notify::new());

        let (prev_a, next_a) = tails.reserve(7);
        let a = tokio::spawn({
            let order = order.clone();
            let a_acquired = a_acquired.clone();
            let release_a = release_a.clone();
            async move {
                let mut turn = TurnGuard::new(prev_a, next_a);
                turn.await_turn().await;
                a_acquired.notify_one();
                release_a.notified().await;
                order.lock().expect("order").push(1u32);
                drop(turn);
            }
        });
        a_acquired.notified().await;

        let (prev_b, next_b) = tails.reserve(7);
        let b = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_b, next_b);
                turn.await_turn().await;
                order.lock().expect("order").push(2u32);
                drop(turn);
            }
        });

        let (prev_c, next_c) = tails.reserve(7);
        let c = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_c, next_c);
                turn.await_turn().await;
                order.lock().expect("order").push(3u32);
                drop(turn);
            }
        });

        // Cancel B while it waits for A. Its successor C must stay blocked
        // until A actually completes, then run (without B ever obtaining the
        // turn).
        tokio::task::yield_now().await;
        b.abort();
        let _ = b.await;

        tokio::time::sleep(Duration::from_millis(30)).await;
        let during = order.lock().expect("order").clone();
        assert_eq!(
            during,
            Vec::<u32>::new(),
            "nothing may run before A finishes"
        );

        release_a.notify_one();
        a.await.expect("A joined");
        c.await.expect("C joined");

        let final_order = order.lock().expect("order").clone();
        assert_eq!(
            final_order,
            vec![1, 3],
            "successor must run after the predecessor, skipped waiter excluded"
        );
    }

    #[tokio::test]
    async fn cancelled_after_acquiring_turn_releases_successor() {
        let tails = Arc::new(AuthorTails::new());
        let order = Arc::new(std::sync::Mutex::new(Vec::new()));
        let b_acquired = Arc::new(Notify::new());
        let hold_b = Arc::new(Notify::new());

        let (prev_a, next_a) = tails.reserve(7);
        let a = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_a, next_a);
                turn.await_turn().await; // no predecessor: immediate
                order.lock().expect("order").push(1u32);
                drop(turn);
            }
        });

        let (prev_b, next_b) = tails.reserve(7);
        let b = tokio::spawn({
            let order = order.clone();
            let b_acquired = b_acquired.clone();
            let hold_b = hold_b.clone();
            async move {
                let mut turn = TurnGuard::new(prev_b, next_b);
                turn.await_turn().await;
                b_acquired.notify_one();
                hold_b.notified().await;
                order.lock().expect("order").push(2u32);
                drop(turn);
            }
        });
        b_acquired.notified().await;

        let (prev_c, next_c) = tails.reserve(7);
        let c = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_c, next_c);
                turn.await_turn().await;
                order.lock().expect("order").push(3u32);
                drop(turn);
            }
        });

        // B holds the turn; cancelling the task must release its successor C
        // immediately (the turn was already acquired).
        b.abort();
        let _ = b.await;
        c.await.expect("C joined");
        let _ = a.await;

        let final_order = order.lock().expect("order").clone();
        assert_eq!(
            final_order,
            vec![1, 3],
            "aborted holder must release successor"
        );
    }

    #[tokio::test]
    async fn panicking_turn_holder_releases_successor() {
        let tails = Arc::new(AuthorTails::new());
        let order = Arc::new(std::sync::Mutex::new(Vec::new()));

        let (prev_a, next_a) = tails.reserve(7);
        let a = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_a, next_a);
                turn.await_turn().await;
                order.lock().expect("order").push(1u32);
                // Panic while the guard is still alive: the drop during
                // unwinding must release the successor.
                panic!("simulated moderation panic");
            }
        });

        let joined = a.await;
        assert!(
            matches!(&joined, Err(error) if error.is_panic()),
            "task must have panicked, got {joined:?}"
        );

        let (prev_b, _) = tails.reserve(7);
        let b = tokio::spawn({
            let order = order.clone();
            async move {
                let mut turn = TurnGuard::new(prev_b, Arc::new(Notify::new()));
                turn.await_turn().await;
                order.lock().expect("order").push(2u32);
                drop(turn);
            }
        });
        b.await.expect("B joined");

        let final_order = order.lock().expect("order").clone();
        assert_eq!(
            final_order,
            vec![1, 2],
            "panicked holder must still release the successor"
        );
    }

    #[test]
    fn fingerprint_dedup_skips_same_content_and_accepts_changes() {
        let now = Instant::now();
        let dedup = FingerprintDedup::new(Duration::from_secs(60), 4);
        assert!(dedup.claim(1, "a", now));
        assert!(!dedup.claim(1, "a", now + Duration::from_secs(1)));
        assert!(dedup.claim(1, "b", now + Duration::from_secs(2)));
        assert!(dedup.claim(2, "a", now + Duration::from_secs(3)));
        // TTL expiry (60s window: entry touched at +2s has aged past 60s) allows
        // reprocessing of the same fingerprint.
        assert!(dedup.claim(1, "b", now + Duration::from_secs(63)));
    }

    #[test]
    fn classifies_fetch_errors_as_not_found_only_for_404() {
        assert_eq!(classify_fetch_status(Some(404)), FetchErrorKind::NotFound);
        assert_eq!(classify_fetch_status(Some(500)), FetchErrorKind::Other);
        assert_eq!(classify_fetch_status(Some(403)), FetchErrorKind::Other);
        assert_eq!(classify_fetch_status(None), FetchErrorKind::Other);
    }

    #[test]
    fn current_message_status_enums_are_exhaustive_and_distinct() {
        match CurrentMessageStatus::Matches {
            CurrentMessageStatus::Matches => {}
            CurrentMessageStatus::Stale => panic!("wrong variant"),
            CurrentMessageStatus::Unavailable(_) => panic!("wrong variant"),
        }
    }

    #[test]
    fn eligible_for_regular_guild_message() {
        let snap = snapshot();
        assert!(snapshot_is_eligible(
            &snap,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));
    }

    #[test]
    fn ineligible_for_bot_webhook_system_dm_and_wrong_guild() {
        let mut bot = snapshot();
        bot.author_bot = true;
        assert!(!snapshot_is_eligible(
            &bot,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut webhook = snapshot();
        webhook.webhook_id = Some(9);
        assert!(!snapshot_is_eligible(
            &webhook,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut system = snapshot();
        system.author_system = true;
        assert!(!snapshot_is_eligible(
            &system,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut dm = snapshot();
        dm.guild_id = None;
        assert!(!snapshot_is_eligible(
            &dm,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut other_guild = snapshot();
        other_guild.guild_id = Some(GuildId::new(999));
        assert!(!snapshot_is_eligible(
            &other_guild,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));
    }

    #[test]
    fn rejects_moderation_channel_threads_and_unsupported_kind() {
        let mut in_channel = snapshot();
        in_channel.channel_id = ChannelId::new(200);
        assert!(!snapshot_is_eligible(
            &in_channel,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut thread = snapshot();
        thread.channel_id = ChannelId::new(201);
        assert!(!snapshot_is_eligible(
            &thread,
            GuildId::new(100),
            ChannelId::new(200),
            Some(ChannelId::new(200))
        ));

        let mut other_thread = snapshot();
        other_thread.channel_id = ChannelId::new(202);
        assert!(snapshot_is_eligible(
            &other_thread,
            GuildId::new(100),
            ChannelId::new(200),
            Some(ChannelId::new(50))
        ));

        let mut unsupported = snapshot();
        unsupported.kind = MessageKind::Unsupported;
        assert!(!snapshot_is_eligible(
            &unsupported,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));
    }

    #[test]
    fn empty_message_without_images_ineligible() {
        let mut snap = snapshot();
        snap.content.clear();
        assert!(!snapshot_is_eligible(
            &snap,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));

        let mut with_image = snap.clone();
        with_image.attachments.push(image("a.png"));
        assert!(snapshot_is_eligible(
            &with_image,
            GuildId::new(100),
            ChannelId::new(200),
            None
        ));
    }

    #[test]
    fn fingerprint_tracks_content_and_attachments() {
        let a = snapshot();

        let mut b = a.clone();
        b.content.push('!');
        assert_ne!(a.fingerprint(), b.fingerprint());

        let mut c = a.clone();
        c.attachments.push(image("a.png"));
        assert_ne!(a.fingerprint(), c.fingerprint());
    }

    #[test]
    fn fingerprint_ignores_attachment_order() {
        let mut a = snapshot();
        let mut b = a.clone();
        a.attachments = vec![image("b.png"), image("a.png")];
        b.attachments = vec![image("a.png"), image("b.png")];
        assert_eq!(a.fingerprint(), b.fingerprint());
    }

    #[test]
    fn fingerprint_distinguishes_url_in_text_from_attachment() {
        let url = "https://cdn.discordapp.com/attachments/123/456/a.png";

        // Message content alone contains the CDN URL on a second line.
        let mut text_only = snapshot();
        text_only.content = format!("hello\n{url}");

        // Same leading content plus a real attachment carrying that URL must
        // not collide with the text-only message.
        let mut with_attachment = snapshot();
        with_attachment.content = "hello".to_string();
        with_attachment.attachments.push(ImageRef {
            url: url.to_string(),
            filename: "a.png".to_string(),
            content_type: Some("image/png".to_string()),
            declared_size: Some(10),
            width: Some(400),
            height: Some(300),
        });

        assert_ne!(
            text_only.fingerprint(),
            with_attachment.fingerprint(),
            "text containing an URL must not equal the same text plus an attachment"
        );
    }

    #[test]
    fn fingerprint_tracks_attachment_metadata() {
        let baseline = mutate_identity(|_| {});
        assert_ne!(
            baseline,
            mutate_identity(|a| a.filename = "renamed.png".into())
        );
        assert_ne!(
            baseline,
            mutate_identity(|a| a.content_type = Some("image/jpeg".into()))
        );
        assert_ne!(baseline, mutate_identity(|a| a.declared_size = Some(99)));
        assert_ne!(baseline, mutate_identity(|a| a.width = Some(200)));
        assert_ne!(baseline, mutate_identity(|a| a.height = Some(50)));
    }

    fn mutate_identity(change: impl FnOnce(&mut ImageRef)) -> String {
        let mut snap = snapshot();
        let mut attachment = ImageRef {
            url: "https://cdn.discordapp.com/attachments/1/1/a.png".to_string(),
            filename: "a.png".to_string(),
            content_type: Some("image/png".to_string()),
            declared_size: Some(10),
            width: Some(400),
            height: Some(300),
        };
        change(&mut attachment);
        snap.attachments = vec![attachment];
        snap.fingerprint()
    }

    #[test]
    fn credit_dedup_claims_once_then_bounds() {
        let now = Instant::now();
        let dedup = CreditDedup::new(Duration::from_secs(60), 2);
        assert!(dedup.claim(1, now));
        assert!(!dedup.claim(1, now + Duration::from_secs(1)));
        assert!(dedup.claim(2, now + Duration::from_secs(2)));
        // At capacity the oldest (1) is evicted.
        assert!(dedup.claim(3, now + Duration::from_secs(3)));
        // Expired entry (1) is pruned and claimable again.
        assert!(dedup.claim(1, now + Duration::from_secs(61)));
        assert!(dedup.claim(2, now + Duration::from_secs(62)));
    }
}
