use regex::Regex;
use std::fmt;
use std::str::FromStr;
use std::sync::LazyLock;

static MAP_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:https?://)?(?:www\.)?(?:geoguessr\.com/maps/)?([a-zA-Z0-9_-]+)$").unwrap()
});

#[derive(Debug)]
pub struct ParseError {
    message: String,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ParseError {}

pub struct GeoGuessrMap {
    pub id: String,
}

impl GeoGuessrMap {
    fn validate_id(id: &str) -> bool {
        id.len() == 24 && id.chars().all(|c| c.is_ascii_hexdigit())
    }
}

impl FromStr for GeoGuessrMap {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let trimmed = s.trim();

        if let Some(captures) = MAP_REGEX.captures(trimmed) {
            if let Some(id_match) = captures.get(1) {
                let id = id_match.as_str();

                if Self::validate_id(id) {
                    return Ok(GeoGuessrMap { id: id.to_string() });
                }
            }
        }

        Err(ParseError {
            message: "Could not extract valid GeoGuessr map ID".to_string(),
        })
    }
}
