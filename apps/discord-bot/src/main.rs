use clap::Parser;

use cli::{Cli, Command};

type Error = Box<dyn std::error::Error + Send + Sync>;

mod alm;
mod challenge;
mod cli;
mod config;
mod discord;
mod logging;
mod spam_check;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let cli = Cli::parse();
    logging::init();

    let result = match cli.command {
        None => {
            tracing::info!(mode = "gateway", "starting Discord bot");
            discord::run().await
        }
        Some(Command::Challenge) => {
            tracing::info!(mode = "challenge", "starting Discord bot");
            challenge::run().await
        }
        Some(Command::SpamCheck { text }) => spam_check::run(&text).await,
    };

    if let Err(error) = &result {
        tracing::error!(error = %error, "Discord bot exited with an error");
    }
    result
}
