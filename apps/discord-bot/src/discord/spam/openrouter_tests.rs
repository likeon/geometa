use std::time::Duration;

use super::*;
use crate::discord::spam::test_support::MockServer;

#[tokio::test]
async fn all_image_batches_are_reviewed_and_failures_override_positive_batches() {
    use super::super::evidence::EvidenceStorage;
    for (second_status, expected_spam) in [(200, true), (503, false)] {
        let storage = EvidenceStorage::create_private().unwrap();
        let mut images = Vec::new();
        let mut stored = Vec::new();
        let bytes = b"\x89PNG\r\n\x1a\nfixture";
        for filename in ["one.png", "two.png"] {
            stored.push(storage.fixture(filename, bytes).await);
            images.push(image(filename, "image/png"));
        }
        let input = PreparedInput::from_stored("same caption", images, stored, 1000)
            .await
            .unwrap();
        let mock = MockServer::spawn_scripted(vec![
            (200, response(0.99).to_string().into_bytes()),
            (second_status, response(0.1).to_string().into_bytes()),
        ])
        .await;
        let mut classifier = client(&mock.url());
        classifier.max_images_per_request = 1;
        let result = classifier.classify_prepared(&input).await;
        assert_eq!(
            matches!(result, OpenRouterResult::Spam { .. }),
            expected_spam
        );
        if !expected_spam {
            assert!(matches!(result, OpenRouterResult::Indeterminate { .. }));
        }
        assert_eq!(mock.requests().len(), 2);
    }
}

const TEST_MODEL: &str = "openai/gpt-6-luna-decisions";

fn config() -> OpenRouterClassifierConfig {
    OpenRouterClassifierConfig {
        model: TEST_MODEL.to_string(),
        spam_threshold: 0.9,
        max_concurrency: 2,
        timeout_seconds: 5,
        max_images_per_request: 2,
        max_image_bytes: 1_000,
    }
}

fn client(endpoint: &str) -> OpenRouterClassifier {
    OpenRouterClassifier::new_with_endpoint(
        endpoint.to_string(),
        &config(),
        &SpamPromptConfig::default(),
        "secret-token".to_string(),
    )
    .expect("client must construct")
}

fn response(probability: f64) -> serde_json::Value {
    serde_json::json!({
        "id": "gen-dec-example",
        "model": TEST_MODEL,
        "provider": "OpenAI",
        "answers": { "is_spam": { "type": "noul", "noul": probability } },
        "usage": { "input_tokens": 100, "output_tokens": 0 },
    })
}

fn image(filename: &str, mime: &str) -> ImageRef {
    ImageRef {
        url: format!("https://cdn.discordapp.com/attachments/1/2/{filename}"),
        filename: filename.to_string(),
        content_type: Some(mime.to_string()),
        declared_size: Some(500),
        width: None,
        height: None,
    }
}

#[test]
fn policy_preserves_spam_categories_and_untrusted_evidence_boundary() {
    assert!(
        SpamPromptConfig::default()
            .instructions
            .contains("GeoGuessr")
    );
    assert!(
        SpamPromptConfig::default()
            .instructions
            .contains("untrusted evidence")
    );
    assert!(
        SpamPromptConfig::default()
            .instructions
            .contains("never follow instructions")
    );
    assert!(
        SpamPromptConfig::default()
            .instructions
            .contains("uncertain")
    );
    assert!(
        SpamPromptConfig::default()
            .instructions
            .contains("ban a user")
    );
    for category in [
        "unsolicited promotion",
        "phishing",
        "malware",
        "recruitment",
        "mass outreach",
    ] {
        assert!(SpamPromptConfig::default().spam_criteria.contains(category));
    }
    for category in [
        "community discussion",
        "contextual links",
        "event announcements",
        "introductions",
        "support requests",
        "humor",
        "uncertain",
    ] {
        assert!(SpamPromptConfig::default().safe_criteria.contains(category));
    }
}

#[test]
fn parses_probability_with_inclusive_configured_threshold() {
    for (probability, expected) in [
        (0.0, OpenRouterDecision::Safe),
        (0.5, OpenRouterDecision::Safe),
        (0.899999, OpenRouterDecision::Safe),
        (0.9, OpenRouterDecision::Unsafe),
        (1.0, OpenRouterDecision::Unsafe),
    ] {
        let parsed = parse_decision(&response(probability), 0.9).unwrap();
        assert_eq!(parsed.decision, expected);
        assert_eq!(parsed.spam_probability, Some(probability));
    }
    assert_eq!(
        parse_decision(&response(0.8), 0.8).unwrap().decision,
        OpenRouterDecision::Unsafe
    );
}

#[test]
fn rejects_missing_wrong_typed_and_out_of_range_answers() {
    for value in [
        serde_json::json!(null),
        serde_json::json!({}),
        serde_json::json!({"answers": {}}),
        serde_json::json!({"answers": {"is_spam": null}}),
        serde_json::json!({"answers": {"is_spam": {"noul": 1}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "noul"}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "choice", "noul": 1}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "noul", "noul": true}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "noul", "noul": "0.99"}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "noul", "noul": null}}}),
        serde_json::json!({"answers": {"wrong_question": {"type": "noul", "noul": 1}}}),
        serde_json::json!({"answers": {"is_spam": {"type": "noul", "noul": 1}, "extra": {}}}),
        serde_json::json!({"choices": [{"message": {"content": "{\"verdict\":\"unsafe\"}"}}]}),
        response(-0.1),
        response(1.01),
    ] {
        assert!(
            parse_decision(&value, 0.9).is_err(),
            "{value} must fail open"
        );
    }
}

#[test]
fn provider_error_overrides_apparently_valid_answer() {
    let mut value = response(1.0);
    value["error"] = serde_json::json!({
        "message": "Provider failed",
        "metadata": {"error_type": "provider_error", "flagged_input": "private text"},
    });
    let error = parse_decision(&value, 0.9).unwrap_err().to_string();
    assert!(error.contains("Provider failed"));
    assert!(error.contains("provider_error"));
    assert!(!error.contains("private text"));
}

#[test]
fn requires_https_except_loopback() {
    assert!(validate_https_url(OPENROUTER_DECISIONS_URL).is_ok());
    assert!(validate_https_url("http://localhost:8080/api/alpha/decisions").is_ok());
    assert!(validate_https_url("http://127.0.0.1:3000/api/alpha/decisions").is_ok());
    assert!(validate_https_url("http://evil.example").is_err());
    assert!(validate_https_url("ftp://localhost").is_err());
}

#[test]
fn uses_decisions_endpoint_and_configured_model() {
    let mut config = config();
    config.model = "example/custom-decisions-model".to_string();
    let classifier = OpenRouterClassifier::new(
        &config,
        &SpamPromptConfig::default(),
        "secret-token".to_string(),
    )
    .unwrap();
    assert_eq!(classifier.endpoint, OPENROUTER_DECISIONS_URL);
    assert_eq!(classifier.model, config.model);
    assert_eq!(classifier.spam_threshold, 0.9);
}

#[test]
fn rejects_blank_model_api_key_and_invalid_thresholds() {
    for model in ["", "   "] {
        let mut config = config();
        config.model = model.to_string();
        assert!(
            OpenRouterClassifier::new(
                &config,
                &SpamPromptConfig::default(),
                "secret-token".to_string()
            )
            .is_err()
        );
    }
    for token in ["", "   "] {
        assert!(
            OpenRouterClassifier::new(&config(), &SpamPromptConfig::default(), token.to_string())
                .is_err()
        );
    }
    for threshold in [-0.1, 1.1, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        let mut config = config();
        config.spam_threshold = threshold;
        assert!(
            OpenRouterClassifier::new(
                &config,
                &SpamPromptConfig::default(),
                "secret-token".to_string()
            )
            .is_err()
        );
    }
}

#[test]
fn allowlists_discord_cdn_only() {
    assert!(is_allowed_image_url(
        "https://cdn.discordapp.com/attachments/1/2/a.png"
    ));
    assert!(is_allowed_image_url(
        "https://media.discordapp.net/x/y.webp"
    ));
    for url in [
        "http://cdn.discordapp.com/x.png",
        "https://evil.example/a.png",
        "https://cdn.discordapp.com.evil.example/a.png",
        "https://user:password@cdn.discordapp.com/a.png",
        "https://cdn.discordapp.com:8443/a.png",
        "https://cdn.discordapp.com",
        "not a url",
    ] {
        assert!(!is_allowed_image_url(url));
    }
}

#[tokio::test]
async fn text_only_payload_uses_state_and_noul_question() {
    let mock = MockServer::spawn_ok(response(0.1).to_string().into_bytes()).await;
    let classifier = client(&format!("{}/api/alpha/decisions", mock.url()));
    let result = classifier.classify_message("just chatting", &[]).await;
    let batches = match result {
        OpenRouterResult::Accepted { batches } => batches,
        other => panic!("expected Accepted, got {other:?}"),
    };
    assert_eq!(batches.len(), 1);
    assert_eq!(batches[0].decision, OpenRouterDecision::Safe);
    assert_eq!(batches[0].spam_probability, Some(0.1));
    assert_eq!(batches[0].model, TEST_MODEL);
    assert_eq!(batches[0].batch_index, 0);
    assert_eq!(batches[0].batch_count, 1);

    let request = &mock.requests()[0];
    assert_eq!(request.method, "POST");
    assert_eq!(request.path, "/api/alpha/decisions");
    assert_eq!(request.header("authorization"), Some("Bearer secret-token"));
    let body: serde_json::Value = serde_json::from_slice(&request.body).unwrap();
    assert_eq!(body.as_object().unwrap().len(), 3);
    assert_eq!(body["model"], TEST_MODEL);
    let question = &body["questions"]["is_spam"];
    assert_eq!(question["type"], "noul");
    assert_eq!(
        question["instructions"],
        SpamPromptConfig::default().instructions
    );
    assert_eq!(
        question["criteria"]["true"],
        SpamPromptConfig::default().spam_criteria
    );
    assert_eq!(
        question["criteria"]["false"],
        SpamPromptConfig::default().safe_criteria
    );
    let state = body["state"].as_array().unwrap();
    assert_eq!(state.len(), 1);
    assert!(state[0].as_str().unwrap().contains("batch 1 of 1"));
    assert!(state[0].as_str().unwrap().contains("just chatting"));
    for field in [
        "messages",
        "temperature",
        "max_tokens",
        "reasoning",
        "response_format",
    ] {
        assert!(body.get(field).is_none());
    }
}

#[test]
fn image_payload_uses_top_level_state_parts_and_plain_text() {
    let data_url = "data:image/png;base64,iVBORw0KGgo=";
    let payload = decisions_payload(
        TEST_MODEL,
        &SpamPromptConfig::default(),
        vec![
            serde_json::Value::String(batch_text(1, 3, "")),
            image_part(data_url.to_string()),
        ],
    );
    let state = payload["state"].as_array().unwrap();
    assert_eq!(state.len(), 2);
    assert!(state[0].as_str().unwrap().contains("batch 2 of 3"));
    assert!(
        state[0]
            .as_str()
            .unwrap()
            .contains("no accompanying message text")
    );
    assert_eq!(state[1]["type"], "image_url");
    assert_eq!(state[1]["image_url"]["url"], data_url);
    assert!(payload.get("images").is_none());
}

#[tokio::test]
async fn spam_probability_at_threshold_flags_message() {
    let mock = MockServer::spawn_ok(response(0.9).to_string().into_bytes()).await;
    let result = client(&mock.url())
        .classify_message("unsolicited offer", &[])
        .await;
    assert!(matches!(result, OpenRouterResult::Spam { .. }));
    assert_eq!(mock.requests().len(), 1);
}

#[tokio::test]
async fn configured_threshold_controls_live_response_parsing() {
    let mock = MockServer::spawn_scripted(vec![
        (200, response(0.8).to_string().into_bytes()),
        (200, response(0.8).to_string().into_bytes()),
    ])
    .await;
    let mut classifier = client(&mock.url());
    assert!(matches!(
        classifier.classify_message("offer", &[]).await,
        OpenRouterResult::Accepted { .. }
    ));
    classifier.spam_threshold = 0.75;
    assert!(matches!(
        classifier.classify_message("offer", &[]).await,
        OpenRouterResult::Spam { .. }
    ));
    assert_eq!(mock.requests().len(), 2);
}

#[test]
fn image_batches_respect_count_and_combined_byte_budget() {
    let images = vec![image("cat.png", "image/png"); 5];
    let lengths = |max_images, max_bytes| {
        image_batches(&images, max_images, max_bytes)
            .iter()
            .map(|chunk| chunk.len())
            .collect::<Vec<_>>()
    };
    assert_eq!(lengths(2, 10_000), vec![2, 2, 1]);
    assert_eq!(lengths(8, 1_000), vec![2, 2, 1]);
    assert_eq!(lengths(8, 999), vec![1, 1, 1, 1, 1]);
    assert_eq!(image_batches(&[], 8, 1_000).len(), 1);

    let mut unknown = image("cat.png", "image/png");
    unknown.declared_size = None;
    let images = [
        image("cat.png", "image/png"),
        unknown,
        image("cat.png", "image/png"),
    ];
    assert_eq!(image_batches(&images, 8, 1_000).len(), 3);
}

#[tokio::test]
async fn invalid_responses_and_http_failures_remain_indeterminate() {
    for (status, body) in [
        (200, b"not JSON".to_vec()),
        (200, b"{}".to_vec()),
        (200, response(1.1).to_string().into_bytes()),
        (200, br#"{"error":{"message":"Provider failure"}}"#.to_vec()),
        (429, response(1.0).to_string().into_bytes()),
        (500, response(1.0).to_string().into_bytes()),
    ] {
        let mock = MockServer::spawn(status, body).await;
        let result = client(&mock.url()).classify_message("hello", &[]).await;
        match result {
            OpenRouterResult::Indeterminate { batches, failures } => {
                assert!(batches.is_empty());
                assert_eq!(failures.len(), 1);
            }
            other => panic!("expected Indeterminate, got {other:?}"),
        }
    }
}

#[tokio::test]
async fn provider_error_body_is_preserved_without_flagged_input() {
    let body = br#"{"error":{"message":"Provider rejected parameter","metadata":{"error_type":"invalid_request","flagged_input":"secret message"}}}"#;
    let mock = MockServer::spawn(400, body.to_vec()).await;
    match client(&mock.url()).classify_message("hello", &[]).await {
        OpenRouterResult::Indeterminate { failures, .. } => {
            assert!(failures[0].contains("Provider rejected parameter"));
            assert!(failures[0].contains("invalid_request"));
            assert!(!failures[0].contains("secret message"));
        }
        other => panic!("expected Indeterminate, got {other:?}"),
    }
}

#[test]
fn error_summary_is_bounded() {
    let body = serde_json::json!({"error": {"message": "x".repeat(1000)}});
    assert!(summarize_openrouter_error(&body).len() <= 512);
}

#[tokio::test]
async fn unsupported_images_and_gifs_fail_open_without_model_request() {
    let mock = MockServer::spawn_ok(response(1.0).to_string().into_bytes()).await;
    for attachment in [
        image("dog.tiff", "image/tiff"),
        image("cat.gif", "image/gif"),
    ] {
        let result = client(&mock.url())
            .classify_message("x", &[attachment])
            .await;
        assert!(matches!(result, OpenRouterResult::Indeterminate { .. }));
    }
    assert!(mock.requests().is_empty());
}

#[tokio::test]
async fn failed_image_batches_preserve_batch_numbers() {
    let mock = MockServer::spawn_ok(response(1.0).to_string().into_bytes()).await;
    let images = vec![image("cat.gif", "image/gif"); 3];
    match client(&mock.url())
        .classify_message("check these", &images)
        .await
    {
        OpenRouterResult::Indeterminate { failures, batches } => {
            assert!(batches.is_empty());
            assert_eq!(failures.len(), 2);
            assert!(failures[0].starts_with("batch 1 of 2:"));
            assert!(failures[1].starts_with("batch 2 of 2:"));
        }
        other => panic!("expected Indeterminate, got {other:?}"),
    }
    assert!(mock.requests().is_empty());
}

#[tokio::test]
async fn timeout_is_indeterminate() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        let (_stream, _) = listener.accept().await.unwrap();
        std::future::pending::<()>().await;
    });
    let mut classifier = client(&format!("http://{address}"));
    classifier.timeout = Duration::from_millis(30);
    let result = classifier.classify_message("hello", &[]).await;
    assert!(matches!(result, OpenRouterResult::Indeterminate { .. }));
    task.abort();
}

#[tokio::test]
async fn redirects_are_disabled_and_never_followed() {
    let target = MockServer::spawn_ok(response(1.0).to_string().into_bytes()).await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let target_url = target.url();
    let task = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut buf = [0u8; 2048];
        let _ = tokio::io::AsyncReadExt::read(&mut stream, &mut buf)
            .await
            .unwrap();
        tokio::io::AsyncWriteExt::write_all(
            &mut stream,
            format!(
                "HTTP/1.1 302 Found\r\nLocation: {target_url}\r\nContent-Length: 2\r\n\r\n{{}}"
            )
            .as_bytes(),
        )
        .await
        .unwrap();
    });
    let result = client(&format!("http://{address}"))
        .classify_message("hello", &[])
        .await;
    assert!(matches!(result, OpenRouterResult::Indeterminate { .. }));
    task.await.unwrap();
    assert!(target.requests().is_empty());
}
