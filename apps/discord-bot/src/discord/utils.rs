use log::debug;
use poise::serenity_prelude::{self as serenity, GuildId, User};

use crate::Context;

#[allow(dead_code)]
pub async fn get_user_roles(
    ctx: &Context<'_>,
    user: &User,
    guild_id: &GuildId,
) -> Result<Vec<String>, serenity::Error> {
    let member = guild_id.member(ctx, user.id).await?;

    // Get role IDs
    let role_ids = &member.roles;

    // Get the guild to access role details
    let partial_guild = guild_id.to_partial_guild(ctx).await?;

    // Get role names
    let roles = role_ids
        .iter()
        .filter_map(|role_id| partial_guild.roles.get(role_id))
        .map(|role| role.name.clone())
        .collect();

    debug!("user roles: {roles:?}");

    Ok(roles)
}
