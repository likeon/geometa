use std::collections::{HashMap, HashSet};

use poise::serenity_prelude::{ChannelId, CreateActionRow, CreateButton, CreateMessage, Http};
use rand::prelude::IndexedRandom;
use serde::Deserialize;

use crate::Error;
use crate::alm::api::client::{ChallengeRequest, Client, Map as AlmMap};

const CONFIG_PATH: &str = "config.yaml";
const MAX_BUTTONS: usize = 25;
const MAX_BUTTON_LABEL: usize = 80;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Config {
    challenge: ChallengeConfig,
    game_modes: HashMap<String, GameMode>,
    pools: Vec<Pool>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ChallengeConfig {
    channel_id: u64,
    rounds: u32,
    time_limit: u32,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct GameMode {
    settings: ModeSettings,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ModeSettings {
    forbid_moving: bool,
    forbid_rotating: bool,
    forbid_zooming: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Pool {
    name: String,
    #[serde(default)]
    maps: Vec<Map>,
    learnable_meta: Option<LearnableMeta>,
    #[serde(default)]
    game_modes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq)]
#[serde(deny_unknown_fields)]
struct LearnableMeta {
    region: Option<String>,
    is_shared: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Map {
    name: String,
    map_id: String,
    game_modes: Vec<String>,
}

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
    let config = parse_config(&std::fs::read_to_string(CONFIG_PATH)?)?;
    let selected = select_maps(&config).await?;
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
            rounds: config.challenge.rounds,
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

    post_buttons(config.challenge.channel_id, &links).await?;
    log::info!("posted {} daily challenge buttons", links.len());
    Ok(())
}

fn parse_config(source: &str) -> Result<Config, Error> {
    let config: Config = serde_saphyr::from_str(source)?;
    validate(&config)?;
    Ok(config)
}

fn validate(config: &Config) -> Result<(), Error> {
    if config.challenge.channel_id == 0 {
        return Err(invalid("challenge.channel_id must be positive"));
    }
    if config.challenge.rounds == 0 {
        return Err(invalid("challenge.rounds must be positive"));
    }
    if config.game_modes.is_empty() {
        return Err(invalid("game_modes must not be empty"));
    }
    if config.pools.is_empty() || config.pools.len() > MAX_BUTTONS {
        return Err(invalid("pools must contain between 1 and 25 entries"));
    }

    for pool in &config.pools {
        if pool.name.trim().is_empty() {
            return Err(invalid("pool names must not be empty"));
        }
        match (pool.maps.is_empty(), pool.learnable_meta.as_ref()) {
            (false, None) => {
                for map in &pool.maps {
                    if map.name.trim().is_empty() || map.map_id.trim().is_empty() {
                        return Err(invalid(format!(
                            "{} contains a map without a name or map_id",
                            pool.name
                        )));
                    }
                    validate_modes(&map.game_modes, &config.game_modes, &pool.name)?;
                }
            }
            (true, Some(source)) => {
                if source.region.as_ref().is_some_and(|value| value.is_empty()) {
                    return Err(invalid(format!("{} has an empty region", pool.name)));
                }
                validate_modes(&pool.game_modes, &config.game_modes, &pool.name)?;
            }
            _ => {
                return Err(invalid(format!(
                    "{} must configure either maps or learnable_meta",
                    pool.name
                )));
            }
        }
    }
    Ok(())
}

fn validate_modes(
    names: &[String],
    modes: &HashMap<String, GameMode>,
    owner: &str,
) -> Result<(), Error> {
    if names.is_empty() {
        return Err(invalid(format!("{owner} has no game modes")));
    }
    if let Some(name) = names.iter().find(|name| !modes.contains_key(*name)) {
        return Err(invalid(format!("{owner} references unknown mode {name}")));
    }
    Ok(())
}

async fn select_maps(config: &Config) -> Result<Vec<Candidate>, Error> {
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

async fn post_buttons(channel_id: u64, links: &[ChallengeLink]) -> Result<(), Error> {
    let token = std::env::var("DISCORD_TOKEN")?;
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
        .send_message(&Http::new(&token), CreateMessage::new().components(rows))
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

    use super::{Candidate, choose_unique, parse_config, truncate};

    const CONFIG: &str = r#"
challenge:
  channel_id: 123
  rounds: 10
  time_limit: 0
game_modes:
  nm:
    settings:
      forbid_moving: true
      forbid_rotating: false
      forbid_zooming: false
pools:
  - name: Featured
    maps:
      - name: Map One
        map_id: map-1
        game_modes: [nm]
  - name: Learnable
    learnable_meta: {}
    game_modes: [nm]
"#;

    #[test]
    fn parses_minimal_config_and_rejects_removed_fields() {
        assert!(parse_config(CONFIG).is_ok());
        assert!(parse_config(include_str!("../config.yaml")).is_ok());
        assert!(
            parse_config(&CONFIG.replace("  rounds: 10", "  rounds: 10\n  post_time: 12:00"))
                .is_err()
        );
    }

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
