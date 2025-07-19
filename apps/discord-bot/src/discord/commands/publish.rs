use crate::alm::api::Client;
use crate::alm::api::client::PublishMapError;
use crate::types::GeoGuessrMap;
use crate::{Context, Error};
use log::error;

// make sure to restrict command usage via server permissions
#[poise::command(slash_command, guild_only)]
pub async fn publish(
    ctx: Context<'_>,
    #[description = "GeoGuessr map URL or ID"] map: GeoGuessrMap,
) -> Result<(), Error> {
    let channel_id = ctx.channel_id();
    let channel = channel_id.to_channel(&ctx).await?;
    let guild_channel = channel.guild().unwrap();

    let Some(thread_starter_id) = guild_channel.owner_id else {
        ctx.say("Discord thread has no owner - can't verify map ownership")
            .await?;
        return Ok(());
    };

    match Client::publish_map(&map.id, thread_starter_id).await {
        Ok(()) => {
            ctx.say("Map successfully published").await?;
        }
        Err(PublishMapError::MapNotFound) => {
            ctx.say("Map not found in ALM database").await?;
        }
        Err(PublishMapError::ValidationError(errors)) => {
            let error_list = errors.join("\n• ");
            ctx.say(format!("Map validation failed:\n• {error_list}"))
                .await?;
        }
        Err(PublishMapError::Unknown(message, maybe_reqwest_error)) => {
            error!("publish_map error: {message}");
            if let Some(reqwest_error) = maybe_reqwest_error {
                error!("{reqwest_error:#?}");
            }
            ctx.say("Unexpected error occured").await?;
        }
        Err(PublishMapError::AuthError(message)) => {
            error!("Authentication error: {message}");
            ctx.say("Authentication error - please contact an administrator")
                .await?;
        }
    }

    Ok(())
}
