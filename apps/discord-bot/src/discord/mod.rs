mod commands;
mod geoguessr;
mod spam;

use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use poise::serenity_prelude as serenity;
use tokio::signal;
use tokio::sync::Semaphore;
use tracing::{error, info};

use crate::Error;
use crate::config::{CONFIG, ServicesConfig, SpamDetection, load_api_client_config};
use commands::publish;
use spam::dispatch::{EditWork, MessageSnapshot, Pipeline, QueuedEvent, SpamService};
use spam::evidence::{AlertReporter, EvidenceStorage};
use spam::onnx::OnnxClassifier;
use spam::openrouter::OpenRouterClassifier;

struct Data {
    spam: Option<SpamService>,
}
type Context<'a> = poise::Context<'a, Data, Error>;
type FrameworkContext<'a> = poise::FrameworkContext<'a, Data, Error>;

pub(crate) async fn run() -> Result<(), Error> {
    let api_client_config = load_api_client_config()?;
    let config = &*CONFIG;
    config.validate_gateway()?;
    crate::alm::api::client::Client::initialize(api_client_config)?;
    let token = config.discord_token()?.to_owned();
    // Static spam dependencies (config, URLs, tokenizer, HTTP clients, evidence
    // root) are prepared before the client is built, so config problems fail
    // fast with a nonzero exit.
    let prepared = match &config.spam_detection {
        Some(spam) => Some(PreparedSpam::prepare(spam, &config.services)?),
        None => None,
    };
    let spam_configured = prepared.is_some();

    let mut intents = serenity::GatewayIntents::non_privileged();
    if spam_configured {
        intents |= serenity::GatewayIntents::MESSAGE_CONTENT;
    }

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: vec![publish()],
            event_handler: |ctx, event, framework, data| {
                Box::pin(handle_event(ctx, event, framework, data))
            },
            ..Default::default()
        })
        .setup(move |ctx, _ready, framework| {
            let prepared = prepared;
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                let spam = match prepared {
                    Some(prepared) => Some(prepared.finish(ctx)?),
                    None => None,
                };
                Ok(Data { spam })
            })
        })
        .build();

    let mut client = serenity::ClientBuilder::new(token, intents)
        .framework(framework)
        .await
        .expect("Error creating client");

    let shard_manager = client.shard_manager.clone();
    let bot_task = tokio::spawn(async move { client.start().await });

    // Gateway/setup errors propagate as a nonzero exit instead of a silent
    // log-and-success return.
    tokio::select! {
        result = bot_task => match result {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                error!(error = ?error, "Discord client failed");
                Err(Box::new(error))
            }
            Err(join_error) => Err(Box::new(std::io::Error::other(format!(
                "bot task panicked: {join_error}"
            )))),
        },
        _ = setup_shutdown_handler() => {
            info!("Shutdown signal received, stopping bot gracefully...");
            shard_manager.shutdown_all().await;
            info!("Bot shutdown complete");
            Ok(())
        }
    }
}

/// Validated, context-free spam dependencies, attached to the Serenity
/// context once the gateway connects.
struct PreparedSpam {
    mode: crate::config::SpamDetectionMode,
    guild_id: u64,
    moderation_channel_id: u64,
    ban_delete_message_seconds: u64,
    queue_capacity: usize,
    onnx: Arc<OnnxClassifier>,
    onnx_semaphore: Arc<Semaphore>,
    onnx_concurrency: usize,
    classifier: Arc<OpenRouterClassifier>,
    classifier_semaphore: Arc<Semaphore>,
    classifier_concurrency: usize,
    evidence: Arc<EvidenceStorage>,
    max_image_bytes: u64,
}

impl PreparedSpam {
    /// Fails fast on missing config or invalid URLs before any Discord connection.
    fn prepare(spam: &SpamDetection, services: &ServicesConfig) -> Result<Self, Error> {
        let onnx_url = services.onnx_api_url()?;
        let tokenizer_path = services.onnx_tokenizer_path()?;
        let openrouter_api_key = services.openrouter_api_key()?;

        let onnx = Arc::new(OnnxClassifier::new(
            onnx_url.to_owned(),
            Path::new(tokenizer_path),
            spam.onnx.model.clone(),
            spam.onnx.version.clone(),
            spam.onnx.spam_threshold,
            Duration::from_secs(spam.onnx.timeout_seconds),
        )?);
        let classifier = Arc::new(OpenRouterClassifier::new(
            spam.openrouter.model.clone(),
            openrouter_api_key.to_owned(),
            Duration::from_secs(spam.openrouter.timeout_seconds),
            spam.openrouter.max_images_per_request,
            spam.openrouter.max_image_bytes,
        )?);

        let evidence = Arc::new(EvidenceStorage::create_private()?);

        Ok(Self {
            mode: spam.mode,
            guild_id: spam.guild_id,
            moderation_channel_id: spam.moderation_channel_id,
            ban_delete_message_seconds: spam.ban_delete_message_seconds,
            queue_capacity: spam.queue_capacity,
            onnx,
            onnx_semaphore: Arc::new(Semaphore::new(spam.onnx.max_concurrency)),
            onnx_concurrency: spam.onnx.max_concurrency,
            classifier,
            classifier_semaphore: Arc::new(Semaphore::new(spam.openrouter.max_concurrency)),
            classifier_concurrency: spam.openrouter.max_concurrency,
            evidence,
            max_image_bytes: spam.openrouter.max_image_bytes,
        })
    }

    fn finish(self, ctx: &serenity::Context) -> Result<SpamService, Error> {
        let reporter = Arc::new(AlertReporter::new(
            ctx.http.clone(),
            self.moderation_channel_id.into(),
        ));

        let pipeline = Arc::new(Pipeline {
            mode: self.mode,
            guild_id: self.guild_id.into(),
            moderation_channel_id: self.moderation_channel_id.into(),
            ban_delete_message_seconds: self.ban_delete_message_seconds,
            onnx: self.onnx.clone(),
            onnx_semaphore: self.onnx_semaphore,
            onnx_concurrency: self.onnx_concurrency,
            classifier: self.classifier.clone(),
            classifier_semaphore: self.classifier_semaphore,
            classifier_concurrency: self.classifier_concurrency,
            evidence: self.evidence.clone(),
            evidence_semaphore: Arc::new(Semaphore::new(1)),
            reporter,
            ctx: Arc::new(ctx.clone()),
            max_image_bytes: self.max_image_bytes,
            fingerprint_dedup: spam::dispatch::FingerprintDedup::new(
                spam::dispatch::FINGERPRINT_DEDUP_TTL,
                spam::dispatch::FINGERPRINT_DEDUP_MAX,
            ),
            credit_dedup: spam::dispatch::CreditDedup::new(
                spam::dispatch::CREDIT_DEDUP_TTL,
                spam::dispatch::CREDIT_DEDUP_MAX,
            ),
        });

        Ok(SpamService::new(pipeline, self.queue_capacity))
    }
}

async fn handle_event(
    _ctx: &serenity::Context,
    event: &serenity::FullEvent,
    _framework: FrameworkContext<'_>,
    data: &Data,
) -> Result<(), Error> {
    let Some(service) = &data.spam else {
        return Ok(());
    };

    match event {
        serenity::FullEvent::Message { new_message } => {
            let snapshot = MessageSnapshot::from_message(new_message);
            let _ = service.enqueue(QueuedEvent::Create(Box::new(snapshot)));
        }
        serenity::FullEvent::MessageUpdate { new, event, .. } => {
            // Only content/attachment updates carry something to classify;
            // embed/metadata edits are ignored. Removing attachments or
            // emptying content still re-inspects.
            let content_present = event.content.is_some();
            let attachments_present = event.attachments.is_some();
            if !content_present && !attachments_present {
                return Ok(());
            }

            let author_hint = event
                .author
                .as_ref()
                .map(|user| user.id.get())
                .or_else(|| new.as_ref().map(|message| message.author.id.get()));
            let _ = service.enqueue(QueuedEvent::Edit(EditWork {
                message_id: event.id,
                channel_id: event.channel_id,
                author_hint,
            }));
        }
        _ => {}
    }

    Ok(())
}

async fn setup_shutdown_handler() {
    #[cfg(unix)]
    {
        let mut sigterm = signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to create SIGTERM handler");

        tokio::select! {
            _ = sigterm.recv() => {
                info!("Received SIGTERM");
            }
            _ = signal::ctrl_c() => {
                info!("Received SIGINT (Ctrl+C)");
            }
        }
    }

    #[cfg(not(unix))]
    {
        signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");
        info!("Received Ctrl+C");
    }
}
