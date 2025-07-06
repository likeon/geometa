use poise::serenity_prelude::{self as serenity};
use log::{info, warn};
use tokio::signal;

struct Data {} // User data, which is stored and accessible in all command invocations
type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, Data, Error>;

mod alm;
mod discord;
mod types;

use discord::commands::publish;

#[tokio::main]
async fn main() {
    env_logger::init();
    let token = std::env::var("DISCORD_TOKEN").expect("missing DISCORD_TOKEN");
    let intents = serenity::GatewayIntents::non_privileged();

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: vec![publish()],
            ..Default::default()
        })
        .setup(|ctx, _ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                Ok(Data {})
            })
        })
        .build();

    let mut client = serenity::ClientBuilder::new(token, intents)
        .framework(framework)
        .await
        .expect("Error creating client");

    // Spawn the bot in a separate task
    let shard_manager = client.shard_manager.clone();
    let bot_task = tokio::spawn(async move {
        if let Err(why) = client.start().await {
            warn!("Client error: {why:?}");
        }
    });

    // Wait for either the bot to stop or a shutdown signal
    tokio::select! {
        _ = bot_task => {
            info!("Bot task completed");
        }
        _ = setup_shutdown_handler() => {
            info!("Shutdown signal received, stopping bot gracefully...");
            shard_manager.shutdown_all().await;
            info!("Bot shutdown complete");
        }
    }
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
