use std::collections::{BTreeMap, HashSet};

use poise::serenity_prelude::{ChannelId, CreateAllowedMentions, CreateEmbed, CreateMessage, Http};

use crate::Error;
use crate::alm::api::client::{Client, DailyChallenge, DailyChallengesRequest};
use crate::config::{CONFIG, load_api_client_config};

const CHALLENGES_PER_DIFFICULTY: usize = 2;
const MAX_LINK_TEXT_CHARS: usize = 60;
const DIFFICULTIES: [(u8, &str); 3] = [
    (1, "🟢 Beginner"),
    (2, "🟡 Intermediate"),
    (3, "🔴 Advanced"),
];

#[derive(Debug, PartialEq)]
struct ChallengeGroup {
    label: &'static str,
    challenges: Vec<DailyChallenge>,
}

pub async fn run() -> Result<(), Error> {
    let api_client_config = load_api_client_config()?;
    let config = &*CONFIG;
    config.validate_challenge()?;
    Client::initialize(api_client_config)?;

    let mode = config
        .game_modes
        .get(&config.challenge.game_mode)
        .ok_or_else(|| invalid("challenge references an unknown game mode"))?;
    let response = Client::daily_challenges(&DailyChallengesRequest {
        time_limit: config.challenge.time_limit,
        forbid_moving: mode.settings.forbid_moving,
        forbid_rotating: mode.settings.forbid_rotating,
        forbid_zooming: mode.settings.forbid_zooming,
    })
    .await?;
    let title = format!("Daily GeoGuessr Challenges - {}", response.date);
    let groups = group_challenges(response.challenges)?;

    post_challenges(
        config.challenge.channel_id,
        &title,
        &groups,
        config.discord_token()?,
    )
    .await?;
    tracing::info!(
        batch_id = response.batch_id,
        "posted six daily challenge links"
    );
    Ok(())
}

fn group_challenges(challenges: Vec<DailyChallenge>) -> Result<Vec<ChallengeGroup>, Error> {
    let mut by_difficulty: BTreeMap<u8, Vec<DailyChallenge>> = BTreeMap::new();
    let mut map_ids = HashSet::new();

    for challenge in challenges {
        if !map_ids.insert(challenge.geoguessr_id.clone()) {
            return Err(invalid("ALM API returned a duplicate daily challenge map"));
        }
        by_difficulty
            .entry(challenge.difficulty)
            .or_default()
            .push(challenge);
    }

    let mut groups = Vec::with_capacity(DIFFICULTIES.len());
    for (difficulty, label) in DIFFICULTIES {
        let challenges = by_difficulty.remove(&difficulty).unwrap_or_default();
        if challenges.len() != CHALLENGES_PER_DIFFICULTY {
            return Err(invalid(format!(
                "ALM API returned {} maps for difficulty {difficulty}, expected {CHALLENGES_PER_DIFFICULTY}",
                challenges.len()
            )));
        }
        groups.push(ChallengeGroup { label, challenges });
    }

    if !by_difficulty.is_empty() {
        return Err(invalid("ALM API returned an unknown challenge difficulty"));
    }
    Ok(groups)
}

async fn post_challenges(
    channel_id: u64,
    title: &str,
    groups: &[ChallengeGroup],
    discord_token: &str,
) -> Result<(), Error> {
    let mut embed = CreateEmbed::new().title(title).color(0x0f_8a_6b);

    for group in groups {
        let map_links = group
            .challenges
            .iter()
            .map(format_challenge_link)
            .collect::<Vec<_>>()
            .join("\n");
        embed = embed.field(group.label, map_links, false);
    }

    ChannelId::new(channel_id)
        .send_message(
            &Http::new(discord_token),
            CreateMessage::new()
                .embed(embed)
                .allowed_mentions(CreateAllowedMentions::new()),
        )
        .await?;
    Ok(())
}

fn format_challenge_link(challenge: &DailyChallenge) -> String {
    let name = escape_markdown(&truncate(&challenge.name, MAX_LINK_TEXT_CHARS));
    let author = challenge
        .authors
        .as_deref()
        .filter(|author| !author.trim().is_empty())
        .unwrap_or("Unknown author");
    let author = escape_markdown(&truncate(author, MAX_LINK_TEXT_CHARS));
    format!("[{name}]({}) by **{author}**", challenge.url)
}

fn escape_markdown(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(
            character,
            '\\' | '*' | '_' | '~' | '`' | '|' | '[' | ']' | '<' | '>'
        ) {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

fn truncate(value: &str, limit: usize) -> String {
    value.chars().take(limit).collect()
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
mod tests {
    use super::{DIFFICULTIES, format_challenge_link, group_challenges};
    use crate::alm::api::client::DailyChallenge;

    fn challenge(id: &str, difficulty: u8) -> DailyChallenge {
        DailyChallenge {
            geoguessr_id: id.into(),
            name: format!("Map {id}"),
            authors: Some("Mapper".into()),
            difficulty,
            url: format!("https://www.geoguessr.com/challenge/{id}"),
        }
    }

    #[test]
    fn groups_two_unique_maps_per_difficulty() {
        let groups = group_challenges(vec![
            challenge("advanced-1", 3),
            challenge("beginner-1", 1),
            challenge("intermediate-1", 2),
            challenge("beginner-2", 1),
            challenge("advanced-2", 3),
            challenge("intermediate-2", 2),
        ])
        .expect("valid challenge groups");

        assert_eq!(groups.len(), DIFFICULTIES.len());
        assert_eq!(groups[0].label, "🟢 Beginner");
        assert_eq!(groups[0].challenges.len(), 2);
        assert_eq!(groups[1].label, "🟡 Intermediate");
        assert_eq!(groups[2].label, "🔴 Advanced");
    }

    #[test]
    fn rejects_duplicate_or_incomplete_groups() {
        assert!(
            group_challenges(vec![challenge("duplicate", 1), challenge("duplicate", 1),]).is_err()
        );
        assert!(
            group_challenges(vec![
                challenge("beginner-1", 1),
                challenge("beginner-2", 1),
                challenge("intermediate-1", 2),
                challenge("intermediate-2", 2),
                challenge("advanced-1", 3),
            ])
            .is_err()
        );
    }

    #[test]
    fn formats_linked_map_name_and_bold_author() {
        let challenge = DailyChallenge {
            geoguessr_id: "map-1".into(),
            name: "Map [One]".into(),
            authors: Some("*Mapper*".into()),
            difficulty: 1,
            url: "https://www.geoguessr.com/challenge/token".into(),
        };

        assert_eq!(
            format_challenge_link(&challenge),
            "[Map \\[One\\]](https://www.geoguessr.com/challenge/token) by **\\*Mapper\\***"
        );
    }
}
