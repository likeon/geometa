use super::super::ClassifierDiagnostics;
use super::super::test_support::MockServer;
use super::*;
use std::sync::Arc;

fn discord_message(id: u64) -> Vec<u8> {
    let mut message = serenity::Message::default();
    message.id = MessageId::new(id);
    message.channel_id = serenity::ChannelId::new(99);
    serde_json::to_vec(&message).unwrap()
}

fn reporter(server: &MockServer) -> AlertReporter {
    let http = serenity::http::HttpBuilder::new("test-token")
        .proxy(server.url())
        .ratelimiter_disabled(true)
        .build();
    AlertReporter::new(Arc::new(http), serenity::ChannelId::new(99))
}

#[tokio::test]
async fn duplicates_create_once_then_edit_and_replays_make_no_request() {
    let server = MockServer::spawn_ok(discord_message(900)).await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    for id in [1, 2, 2] {
        let outcome = reporter
            .report_group(
                &group,
                &meta(id),
                &classified(false),
                &Enforcement::AlertOnly,
                &[],
            )
            .await;
        assert!(outcome.post_error.is_none(), "{outcome:?}");
    }
    let requests = server.requests();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0].method, "POST");
    assert_eq!(requests[1].method, "PATCH");
    assert!(requests[1].path.ends_with("/channels/99/messages/900"));
    let first: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
    assert_eq!(first["enforce_nonce"], true);
    assert!(
        first["allowed_mentions"]["parse"]
            .as_array()
            .unwrap()
            .is_empty()
    );
    let second: serde_json::Value = serde_json::from_slice(&requests[1].body).unwrap();
    assert!(
        second["embeds"][0]["title"]
            .as_str()
            .unwrap()
            .contains("2 messages")
    );
}

#[tokio::test]
async fn concurrent_arrivals_coalesce_into_one_complete_post() {
    let server = MockServer::spawn_ok(discord_message(900)).await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    let checked = classified(true);
    let meta_one = meta(1);
    let meta_two = meta(2);
    let (one, two) = tokio::join!(
        reporter.report_group(&group, &meta_one, &checked, &Enforcement::AlertOnly, &[]),
        reporter.report_group(&group, &meta_two, &checked, &Enforcement::AlertOnly, &[]),
    );
    assert!(one.post_error.is_none());
    assert!(two.post_error.is_none());
    let requests = server.requests();
    assert_eq!(requests.len(), 1);
    let body: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
    assert!(
        body["embeds"][0]["title"]
            .as_str()
            .unwrap()
            .contains("2 messages")
    );
}

#[tokio::test]
async fn edit_failure_retries_same_message_instead_of_posting_duplicate() {
    let server = MockServer::spawn_scripted(vec![
        (200, discord_message(900)),
        (
            403,
            br#"{"code":50001,"message":"Missing Access"}"#.to_vec(),
        ),
        (200, discord_message(900)),
    ])
    .await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    assert!(
        reporter
            .report_group(
                &group,
                &meta(1),
                &classified(false),
                &Enforcement::AlertOnly,
                &[]
            )
            .await
            .post_error
            .is_none()
    );
    assert!(
        reporter
            .report_group(
                &group,
                &meta(2),
                &classified(false),
                &Enforcement::AlertOnly,
                &[]
            )
            .await
            .post_error
            .is_some()
    );
    assert!(
        reporter
            .report_group(
                &group,
                &meta(2),
                &classified(false),
                &Enforcement::AlertOnly,
                &[]
            )
            .await
            .post_error
            .is_none()
    );
    let methods: Vec<_> = server
        .requests()
        .iter()
        .map(|request| request.method.clone())
        .collect();
    assert_eq!(methods, ["POST", "PATCH", "PATCH"]);
}

#[tokio::test]
async fn deleted_report_recreates_with_new_nonce() {
    let server = MockServer::spawn_scripted(vec![
        (200, discord_message(900)),
        (
            404,
            br#"{"code":10008,"message":"Unknown Message"}"#.to_vec(),
        ),
        (200, discord_message(901)),
    ])
    .await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    for id in [1, 2] {
        assert!(
            reporter
                .report_group(
                    &group,
                    &meta(id),
                    &classified(false),
                    &Enforcement::AlertOnly,
                    &[]
                )
                .await
                .post_error
                .is_none()
        );
    }
    let requests = server.requests();
    assert_eq!(
        requests
            .iter()
            .map(|request| request.method.as_str())
            .collect::<Vec<_>>(),
        ["POST", "PATCH", "POST"]
    );
    let original: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
    let replacement: serde_json::Value = serde_json::from_slice(&requests[2].body).unwrap();
    assert_ne!(original["nonce"], replacement["nonce"]);
}

#[tokio::test]
async fn failed_create_reuses_nonce_and_refreshes_recovered_post() {
    let server = MockServer::spawn_scripted(vec![
        (
            403,
            br#"{"code":50001,"message":"Missing Access"}"#.to_vec(),
        ),
        (200, discord_message(900)),
    ])
    .await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    assert!(
        reporter
            .report_group(
                &group,
                &meta(1),
                &classified(false),
                &Enforcement::AlertOnly,
                &[]
            )
            .await
            .post_error
            .is_some()
    );
    assert!(
        reporter
            .report_group(
                &group,
                &meta(2),
                &classified(false),
                &Enforcement::AlertOnly,
                &[]
            )
            .await
            .post_error
            .is_none()
    );
    let requests = server.requests();
    assert_eq!(
        requests
            .iter()
            .map(|request| request.method.as_str())
            .collect::<Vec<_>>(),
        ["POST", "POST", "PATCH"]
    );
    let original: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
    let retry: serde_json::Value = serde_json::from_slice(&requests[1].body).unwrap();
    assert_eq!(original["nonce"], retry["nonce"]);
}

#[tokio::test]
async fn overflow_is_uploaded_on_same_report_edit() {
    let server = MockServer::spawn_ok(discord_message(900)).await;
    let reporter = reporter(&server);
    let group = ReportGroup::new(1);
    reporter
        .report_group(
            &group,
            &meta(1),
            &classified(false),
            &Enforcement::AlertOnly,
            &[],
        )
        .await;
    for id in 2..=30 {
        group.record(&meta(id), &classified(false), &Enforcement::AlertOnly);
    }
    let outcome = reporter
        .report_group(
            &group,
            &meta(30),
            &classified(false),
            &Enforcement::AlertOnly,
            &[],
        )
        .await;
    assert!(outcome.post_error.is_none(), "{outcome:?}");
    let requests = server.requests();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[1].method, "PATCH");
    let body = String::from_utf8_lossy(&requests[1].body);
    assert!(body.contains("flagged-messages.txt"));
    for id in 1..=30 {
        assert!(body.contains(&message_link(1, id + 100, id)));
    }
}

fn meta(id: u64) -> EvidenceMeta {
    EvidenceMeta {
        guild_id: 1,
        channel_id: id + 100,
        message_id: id,
        author_id: id + 200,
        content: "same text".to_string(),
        ..Default::default()
    }
}
fn classified(disagreement: bool) -> Classified {
    Classified {
        verdict: if disagreement {
            Verdict::Indeterminate
        } else {
            Verdict::Spam
        },
        diagnostics: ClassifierDiagnostics {
            disagreement,
            ..Default::default()
        },
    }
}

#[test]
fn replays_do_not_add_occurrences_and_action_changes_update_report() {
    let group = ReportGroup::new(1);
    group.record(&meta(1), &classified(false), &Enforcement::AlertOnly);
    group.record(&meta(1), &classified(false), &Enforcement::AlertOnly);
    assert_eq!(group.state.lock().unwrap().occurrences.len(), 1);
    assert_eq!(group.render().revision, 1);
    group.record(&meta(1), &classified(false), &Enforcement::ConfirmedBan);
    assert_eq!(group.render().revision, 2);
}

#[test]
fn overflow_attachment_retains_every_occurrence() {
    let group = ReportGroup::new(1);
    for id in 1..=100 {
        group.record(&meta(id), &classified(false), &Enforcement::AlertOnly);
    }
    let rendered = group.render();
    let full = rendered.full_list.unwrap();
    for id in 1..=100 {
        assert!(full.contains(&message_link(1, id + 100, id)));
    }
    assert_eq!(full.lines().count(), 100);
    let value = serde_json::to_value(rendered.embed).unwrap();
    assert!(value["title"].as_str().unwrap().contains("100 messages"));
    assert!(
        value["fields"]
            .as_array()
            .unwrap()
            .iter()
            .all(|field| field["value"].as_str().unwrap().encode_utf16().count() <= 1024)
    );
}

#[test]
fn safe_override_and_mixed_votes_are_not_labeled_confirmed_spam() {
    for verdict in [Verdict::Accepted, Verdict::Indeterminate] {
        let mut checked = classified(true);
        checked.verdict = verdict;
        let group = ReportGroup::new(1);
        group.record(
            &meta(1),
            &checked,
            &Enforcement::NotApplied("council disagreement; no enforcement".to_string()),
        );
        let value = serde_json::to_value(group.render().embed).unwrap();
        assert!(
            value["title"]
                .as_str()
                .unwrap()
                .contains("Classification disagreement")
        );
        assert!(!value["title"].as_str().unwrap().contains("Spam detected"));
    }
}
