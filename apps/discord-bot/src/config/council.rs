//! Council membership, consensus, and recent-content cache limits.

use serde::Deserialize;

use super::{DEFAULT_OPENROUTER_MODEL, invalid};
use crate::Error;

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Consensus {
    #[default]
    Unanimous,
    Majority,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ModelKind {
    Chat,
    Decisions,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CouncilMemberConfig {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: ModelKind,
    pub model: String,
    pub spam_threshold: Option<f64>,
    #[serde(default = "timeout_seconds")]
    pub timeout_seconds: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CouncilConfig {
    #[serde(default)]
    pub consensus: Consensus,
    pub members: Vec<CouncilMemberConfig>,
}

impl Default for CouncilConfig {
    fn default() -> Self {
        Self {
            consensus: Consensus::Unanimous,
            members: vec![
                CouncilMemberConfig {
                    name: "chat-review".to_string(),
                    kind: ModelKind::Chat,
                    model: "xiaomi/mimo-v2.5".to_string(),
                    spam_threshold: None,
                    timeout_seconds: timeout_seconds(),
                },
                CouncilMemberConfig {
                    name: "decision-review".to_string(),
                    kind: ModelKind::Decisions,
                    model: DEFAULT_OPENROUTER_MODEL.to_string(),
                    spam_threshold: Some(0.9),
                    timeout_seconds: timeout_seconds(),
                },
            ],
        }
    }
}

impl CouncilConfig {
    pub fn validate(&self) -> Result<(), Error> {
        if self.members.is_empty() || self.members.len() > 8 {
            return Err(invalid("council must contain 1..=8 members"));
        }
        let mut names = std::collections::HashSet::new();
        for member in &self.members {
            if member.name.trim().is_empty()
                || member.name.chars().count() > 64
                || member.name.chars().any(char::is_control)
                || !names.insert(member.name.trim())
            {
                return Err(invalid(
                    "council member names must be unique, nonblank, and at most 64 characters",
                ));
            }
            if member.model.trim().is_empty() || member.model.chars().count() > 200 {
                return Err(invalid(
                    "council model must be nonblank and at most 200 characters",
                ));
            }
            if !(1..=300).contains(&member.timeout_seconds) {
                return Err(invalid("council timeout_seconds must be within 1..=300"));
            }
            match (member.kind, member.spam_threshold) {
                (ModelKind::Decisions, Some(value))
                    if value.is_finite() && (0.0..=1.0).contains(&value) => {}
                (ModelKind::Chat, None) => {}
                _ => {
                    return Err(invalid(
                        "decision members require spam_threshold within 0..=1; chat members must omit it",
                    ));
                }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct RecentChecksConfig {
    pub ttl_seconds: u64,
    pub failure_cooldown_seconds: u64,
    pub max_entries: usize,
}

impl Default for RecentChecksConfig {
    fn default() -> Self {
        Self {
            ttl_seconds: 600,
            failure_cooldown_seconds: 30,
            max_entries: 1024,
        }
    }
}

impl RecentChecksConfig {
    pub fn validate(&self) -> Result<(), Error> {
        if !(1..=86_400).contains(&self.ttl_seconds)
            || !(1..=self.ttl_seconds).contains(&self.failure_cooldown_seconds)
            || !(1..=10_000).contains(&self.max_entries)
        {
            return Err(invalid(
                "recent_checks requires ttl_seconds 1..=86400, failure_cooldown_seconds 1..=ttl_seconds, max_entries 1..=10000",
            ));
        }
        Ok(())
    }
}

fn timeout_seconds() -> u64 {
    60
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_validate() {
        CouncilConfig::default().validate().unwrap();
        RecentChecksConfig::default().validate().unwrap();
    }

    #[test]
    fn rejects_empty_duplicate_or_invalid_members() {
        let mut config = CouncilConfig::default();
        config.members.clear();
        assert!(config.validate().is_err());
        let mut config = CouncilConfig::default();
        config.members[1].name = config.members[0].name.clone();
        assert!(config.validate().is_err());
        let mut config = CouncilConfig::default();
        config.members[0].spam_threshold = Some(0.9);
        assert!(config.validate().is_err());
        for threshold in [None, Some(f64::NAN), Some(1.1), Some(-0.1)] {
            let mut config = CouncilConfig::default();
            config.members[1].spam_threshold = threshold;
            assert!(config.validate().is_err());
        }
    }

    #[test]
    fn rejects_invalid_cache_limits() {
        let config = RecentChecksConfig {
            failure_cooldown_seconds: 601,
            ..Default::default()
        };
        assert!(config.validate().is_err());
        let config = RecentChecksConfig {
            max_entries: 0,
            ..Default::default()
        };
        assert!(config.validate().is_err());
    }
}
