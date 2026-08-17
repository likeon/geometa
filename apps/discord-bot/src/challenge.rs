use std::collections::{HashMap, HashSet};

use poise::serenity_prelude::{ChannelId, CreateActionRow, CreateButton, CreateMessage, Http};
use rand::prelude::IndexedRandom;

use crate::Error;
use crate::alm::api::client::{ChallengeRequest, Client, Map as AlmMap};
use crate::config::{BotConfig, CONFIG, LearnableMeta, MAX_BUTTON_LABEL};

#[derive(Clone, Debug, PartialEq)]
struct Candidate {
    name: String,
    map_id: String,
    game_modes: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
struct ChallengeLink {
    label: String,
    url: String,
}

pub async fn run() -> Result<(), Error> {
    let config = &*CONFIG;
    config.validate_challenge()?;
    let selected = select_maps(config).await?;
    let mut rng = rand::rng();
    let mut links = Vec::with_capacity(selected.len());

    for map in selected {
        let mode_name = map
            .game_modes
            .choose(&mut rng)
            .ok_or_else(|| invalid("map has no game modes"))?;
        let mode = &config.game_modes[mode_name].settings;
        let url = Client::create_challenge(&ChallengeRequest {
            geoguessr_map_id: &map.map_id,
            time_limit: config.challenge.time_limit,
            forbid_moving: mode.forbid_moving,
            forbid_rotating: mode.forbid_rotating,
            forbid_zooming: mode.forbid_zooming,
        })
        .await?;
        links.push(ChallengeLink {
            label: truncate(&map.name, MAX_BUTTON_LABEL),
            url,
        });
    }

    post_buttons(config.challenge.channel_id, &links, config.discord_token()?).await?;
    tracing::info!("posted {} daily challenge buttons", links.len());
    Ok(())
}

async fn select_maps(config: &BotConfig) -> Result<Vec<Candidate>, Error> {
    let mut catalogs: HashMap<LearnableMeta, Vec<AlmMap>> = HashMap::new();
    let mut selected = Vec::with_capacity(config.pools.len());
    let mut used = HashSet::new();
    let mut rng = rand::rng();

    for pool in &config.pools {
        let candidates = if let Some(source) = &pool.learnable_meta {
            if !catalogs.contains_key(source) {
                let maps = Client::maps(source.region.as_deref(), source.is_shared).await?;
                catalogs.insert(source.clone(), maps);
            }
            alm_candidates(catalogs[source].clone(), &pool.game_modes)
        } else {
            pool.maps
                .iter()
                .map(|map| Candidate {
                    name: map.name.clone(),
                    map_id: map.map_id.clone(),
                    game_modes: map.game_modes.clone(),
                })
                .collect()
        };

        let choice = choose_unique(&candidates, &used, &mut rng, &pool.name)?;
        used.insert(choice.map_id.clone());
        selected.push(choice);
    }

    Ok(selected)
}

fn alm_candidates(maps: Vec<AlmMap>, game_modes: &[String]) -> Vec<Candidate> {
    maps.into_iter()
        .filter(|map| !map.geoguessr_id.is_empty() && !map.name.is_empty())
        .map(|map| Candidate {
            name: map.name,
            map_id: map.geoguessr_id,
            game_modes: game_modes.to_vec(),
        })
        .collect()
}

fn choose_unique<R: rand::Rng + ?Sized>(
    candidates: &[Candidate],
    used: &HashSet<String>,
    rng: &mut R,
    pool_name: &str,
) -> Result<Candidate, Error> {
    candidates
        .iter()
        .filter(|map| !used.contains(&map.map_id))
        .collect::<Vec<_>>()
        .choose(rng)
        .map(|map| (**map).clone())
        .ok_or_else(|| invalid(format!("{pool_name} has no unused maps")))
}

async fn post_buttons(
    channel_id: u64,
    links: &[ChallengeLink],
    discord_token: &str,
) -> Result<(), Error> {
    let rows = links
        .chunks(5)
        .map(|chunk| {
            CreateActionRow::Buttons(
                chunk
                    .iter()
                    .map(|link| CreateButton::new_link(link.url.clone()).label(link.label.clone()))
                    .collect(),
            )
        })
        .collect();

    ChannelId::new(channel_id)
        .send_message(
            &Http::new(discord_token),
            CreateMessage::new().components(rows),
        )
        .await?;
    Ok(())
}

fn truncate(value: &str, limit: usize) -> String {
    value.chars().take(limit).collect()
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use rand::{SeedableRng, rngs::StdRng};

    use super::{Candidate, choose_unique, truncate};

    #[test]
    fn selects_an_unused_map() {
        let candidates = [
            Candidate {
                name: "Used".into(),
                map_id: "used".into(),
                game_modes: vec!["nm".into()],
            },
            Candidate {
                name: "Fresh".into(),
                map_id: "fresh".into(),
                game_modes: vec!["nm".into()],
            },
        ];
        let used = HashSet::from(["used".to_string()]);
        let mut rng = StdRng::seed_from_u64(1);

        assert_eq!(
            choose_unique(&candidates, &used, &mut rng, "pool")
                .unwrap()
                .map_id,
            "fresh"
        );
    }

    #[test]
    fn truncates_button_labels_by_character() {
        assert_eq!(truncate(&"\u{e4}".repeat(81), 80).chars().count(), 80);
    }
}
