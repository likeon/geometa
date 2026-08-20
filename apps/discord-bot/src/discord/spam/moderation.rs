//! Discord moderation actions for confirmed spam.
//!
//! Serenity's high-level ban only takes cleanup in *days*, so use the
//! low-level `Route::GuildBan` request with an explicit
//! `delete_message_seconds` (also avoiding the bulk-ban endpoint's extra
//! `MANAGE_GUILD` permission). Success is declared only on HTTP 204;
//! anything else is reported accurately to evidence.

use poise::serenity_prelude as serenity;
use serenity::http::{Http, LightMethod, Request, Route};
use serenity::model::id::{GuildId, UserId};

pub const MAX_BAN_CLEANUP_SECONDS: u64 = 7 * 24 * 60 * 60;
const _: () = assert!(MAX_BAN_CLEANUP_SECONDS <= 7 * 24 * 60 * 60);

pub const BAN_SUCCESS_STATUS: u16 = 204;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Banned;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BanFailureKind {
    /// 403: missing `Ban Members` or role hierarchy below the target.
    MissingPermission,
    /// 429: rate-limited; retry later.
    RateLimited,
    DiscordStatus(u16),
    UnexpectedSuccessStatus(u16),
    Transport(String),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BanFailure {
    pub kind: BanFailureKind,
    pub detail: String,
}

pub async fn ban_user_with_cleanup(
    http: &Http,
    guild_id: GuildId,
    user_id: UserId,
    delete_message_seconds: u64,
    reason: &str,
) -> Result<Banned, BanFailure> {
    if delete_message_seconds == 0 || delete_message_seconds > MAX_BAN_CLEANUP_SECONDS {
        return Err(BanFailure {
            kind: BanFailureKind::Transport("invalid cleanup window".to_string()),
            detail: format!(
                "delete_message_seconds must be between 1 and {MAX_BAN_CLEANUP_SECONDS}"
            ),
        });
    }

    let request = build_request(guild_id, user_id, delete_message_seconds, reason);

    match http.request(request).await {
        Ok(response) => {
            let status = response.status().as_u16();
            if status == BAN_SUCCESS_STATUS {
                Ok(Banned)
            } else {
                Err(BanFailure {
                    kind: BanFailureKind::UnexpectedSuccessStatus(status),
                    detail: format!(
                        "Discord accepted the ban request but returned status {status}"
                    ),
                })
            }
        }
        Err(error) => Err(classify(&error)),
    }
}

/// Percent-encoded `X-Audit-Log-Reason`, truncated on a `%XX` boundary so it
/// stays within 512 chars and stays well-formed.
fn build_request(
    guild_id: GuildId,
    user_id: UserId,
    delete_message_seconds: u64,
    reason: &str,
) -> Request<'static> {
    use reqwest012::header::{HeaderMap, HeaderName, HeaderValue};

    let mut headers = HeaderMap::new();
    let trimmed = reason.trim();
    if !trimmed.is_empty() {
        let encoded = percent_encode_reason(trimmed);
        if let Ok(value) = HeaderValue::from_str(&encoded) {
            headers.insert(HeaderName::from_static("x-audit-log-reason"), value);
        }
    }

    Request::new(Route::GuildBan { guild_id, user_id }, LightMethod::Put)
        .params(Some(vec![(
            "delete_message_seconds",
            delete_message_seconds.to_string(),
        )]))
        .headers(Some(headers))
}

const MAX_AUDIT_REASON_ENCODED: usize = 512;

/// Truncates on a `%XX` boundary so the header stays well-formed.
fn percent_encode_reason(reason: &str) -> String {
    let encoded = percent_encoding::utf8_percent_encode(reason, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    if encoded.len() <= MAX_AUDIT_REASON_ENCODED {
        return encoded;
    }

    let bytes = encoded.as_bytes();
    let mut end = MAX_AUDIT_REASON_ENCODED;
    loop {
        if end == 0 {
            return String::new();
        }
        let last = bytes[end - 1];
        if last == b'%' {
            // Cut inside a truncation leading percent; back up.
            end -= 1;
            continue;
        }
        if end >= 2 && bytes[end - 2] == b'%' && bytes[end - 1].is_ascii_hexdigit() {
            // Cut between '%' and its second hex digit; back up to the '%'.
            end -= 2;
            continue;
        }
        break;
    }
    encoded[..end].to_string()
}

fn classify(error: &serenity::Error) -> BanFailure {
    let (kind, detail) = match error {
        serenity::Error::Http(http) => match http.status_code().map(|code| code.as_u16()) {
            Some(403) => (
                BanFailureKind::MissingPermission,
                "forbidden: missing Ban Members permission or role hierarchy".to_string(),
            ),
            Some(429) => (
                BanFailureKind::RateLimited,
                "rate limited by Discord; retry later".to_string(),
            ),
            Some(other) => (
                BanFailureKind::DiscordStatus(other),
                format!("Discord error status {other}"),
            ),
            None => (
                BanFailureKind::Transport("Discord error without status".to_string()),
                error.to_string(),
            ),
        },
        _ => (
            BanFailureKind::Transport("transport or client error".to_string()),
            error.to_string(),
        ),
    };
    BanFailure { kind, detail }
}

#[cfg(test)]
mod tests {
    use super::{
        BanFailureKind, MAX_BAN_CLEANUP_SECONDS, ban_user_with_cleanup, build_request, classify,
    };
    use poise::serenity_prelude as serenity;
    use serenity::{
        http::Route,
        model::id::{GuildId, UserId},
    };

    const GUILD: GuildId = GuildId::new(100);
    const USER: UserId = UserId::new(200);

    #[test]
    fn build_request_targets_guild_ban_with_exact_seconds_and_reason() {
        let request = build_request(GUILD, USER, 900, "GeoMeta spam moderation case 100/42");
        assert_eq!(request.method_ref(), &serenity::http::LightMethod::Put);
        assert!(matches!(
            request.route_ref(),
            Route::GuildBan { guild_id, user_id }
                if guild_id.get() == 100 && user_id.get() == 200
        ));
        let params = request.params_ref().expect("params present");
        assert_eq!(
            params
                .iter()
                .find(|(name, _)| *name == "delete_message_seconds")
                .map(|(_, value)| value.as_str()),
            Some("900")
        );

        let headers = request.headers_ref().as_ref().expect("headers present");
        let reason = headers
            .get("x-audit-log-reason")
            .expect("audit reason header");
        assert_eq!(
            reason.to_str().expect("ascii header"),
            "GeoMeta%20spam%20moderation%20case%20100%2F42"
        );
    }

    #[test]
    fn build_request_encodes_and_truncates_reason() {
        let long_reason = format!("GeoMeta spam moderation case {}/{}", "9".repeat(300), 1);
        let request = build_request(GUILD, USER, 900, &long_reason);
        let headers = request.headers_ref().as_ref().expect("headers present");
        let value = headers
            .get("x-audit-log-reason")
            .expect("audit reason header")
            .to_str()
            .expect("ascii header");
        assert!(
            value.len() <= 512,
            "encoded reason too long: {}",
            value.len()
        );
        // Truncation must not split a percent-escape sequence.
        assert!(!value.ends_with('%'));
        assert!(!value.ends_with("%2"));
        assert!(value.starts_with("GeoMeta%20spam%20moderation%20case%20"));
    }

    #[test]
    fn build_request_without_reason_sends_no_header() {
        let request = build_request(GUILD, USER, 900, "");
        let headers = request.headers_ref().as_ref().expect("headers present");
        assert!(headers.get("x-audit-log-reason").is_none());
    }

    #[test]
    fn transport_error_classifies_unknown() {
        let failure = classify(&serenity::Error::Other("boom"));
        assert!(matches!(failure.kind, BanFailureKind::Transport(_)));
        assert!(failure.detail.contains("boom"));
    }

    #[tokio::test]
    async fn out_of_range_window_refused_before_http() {
        let http = serenity::http::Http::new("placeholder-token");
        let failure =
            ban_user_with_cleanup(&http, GUILD, USER, MAX_BAN_CLEANUP_SECONDS + 1, "reason")
                .await
                .expect_err("must reject");
        assert_eq!(
            failure.detail,
            "delete_message_seconds must be between 1 and 604800"
        );
    }
}
