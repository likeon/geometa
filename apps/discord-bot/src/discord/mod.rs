mod commands;
mod geoguessr;

use log::{info, warn};
use poise::serenity_prelude as serenity;
use tokio::signal;

use crate::Error;
use commands::publish;

struct Data;
type Context<'a> = poise::Context<'a, Data, Error>;

pub(crate) async fn run() -> Result<(), Error> {
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
                Ok(Data)
            })
        })
        .build();

    let mut client = serenity::ClientBuilder::new(token, intents)
        .framework(framework)
        .await
        .expect("Error creating client");

    let shard_manager = client.shard_manager.clone();
    let bot_task = tokio::spawn(async move {
        if let Err(why) = client.start().await {
            warn!("Client error: {why:?}");
        }
    });

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
