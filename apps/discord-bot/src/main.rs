type Error = Box<dyn std::error::Error + Send + Sync>;

mod alm;
mod challenge;
mod config;
mod discord;
mod logging;

#[tokio::main]
async fn main() -> Result<(), Error> {
    logging::init();

    let mut args = std::env::args().skip(1);
    let result = match (args.next().as_deref(), args.next()) {
        (None, None) => {
            tracing::info!(mode = "gateway", "starting Discord bot");
            discord::run().await
        }
        (Some("challenge"), None) => {
            tracing::info!(mode = "challenge", "starting Discord bot");
            challenge::run().await
        }
        _ => Err(std::io::Error::other("usage: discord-bot [challenge]").into()),
    };

    if let Err(error) = &result {
        tracing::error!(error = %error, "Discord bot exited with an error");
    }
    result
}
