type Error = Box<dyn std::error::Error + Send + Sync>;

mod alm;
mod challenge;
mod discord;

#[tokio::main]
async fn main() -> Result<(), Error> {
    env_logger::init();

    let mut args = std::env::args().skip(1);
    match (args.next().as_deref(), args.next()) {
        (None, None) => discord::run().await,
        (Some("challenge"), None) => challenge::run().await,
        _ => Err(std::io::Error::other("usage: discord-bot [challenge]").into()),
    }
}
