//! First-stage ONNX spam classifier over Kibaes ONNX Runtime Server REST:
//! `POST {base}/api/sessions/{model}/{version}` with named tensor inputs
//! (`input_ids`, `attention_mask`), never raw text. Response keys are the
//! graph's output names, so responses are parsed strictly by shape (one
//! entry, one row, two finite logits). A positive result only escalates to
//! the configured OpenRouter classifier—it never moderates on its own.

use std::time::Duration;

use reqwest::Client as HttpClient;
use tokenizers::{Tokenizer, TruncationParams};

use crate::Error;

pub const MAX_TOKENS: usize = 512;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnnxVerdict {
    Negative,
    Escalate,
}

#[derive(Clone, Debug, PartialEq)]
pub struct OnnxDiagnostic {
    pub model: String,
    pub version: String,
    pub spam_threshold: f64,
    pub spam_probability: f64,
    pub not_spam_logit: f64,
    pub spam_logit: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct OnnxOutcome {
    pub verdict: OnnxVerdict,
    pub diagnostic: OnnxDiagnostic,
}

pub struct OnnxClassifier {
    tokenizer: Tokenizer,
    base_url: String,
    model: String,
    version: String,
    spam_threshold: f64,
    http: HttpClient,
}

impl OnnxClassifier {
    pub fn new(
        base_url: String,
        tokenizer_path: &std::path::Path,
        model: String,
        version: String,
        spam_threshold: f64,
        timeout: Duration,
    ) -> Result<Self, Error> {
        validate_threshold(spam_threshold)?;
        let base_url = validate_onnx_url(&base_url)?;

        let mut tokenizer = Tokenizer::from_file(tokenizer_path)?;
        tokenizer.with_truncation(Some(TruncationParams {
            max_length: MAX_TOKENS,
            ..Default::default()
        }))?;
        tokenizer.with_padding(None);

        let http = HttpClient::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::none())
            .build()?;
        Ok(Self {
            tokenizer,
            base_url,
            model,
            version,
            spam_threshold,
            http,
        })
    }

    /// Runs one inference over `text`. The orchestration layer filters empty
    /// text upstream; empty input still encodes like any other message.
    pub async fn classify(&self, text: &str) -> Result<OnnxOutcome, Error> {
        let encoding = self
            .tokenizer
            .encode(text, true)
            .map_err(|e| invalid(format!("failed to tokenize message: {e}")))?;
        let input_ids = encoding_to_tensor(encoding.get_ids());
        let attention_mask = encoding_to_tensor(encoding.get_attention_mask());

        tracing::debug!(
            model = %self.model,
            version = %self.version,
            sequence_length = input_ids.len(),
            "tokenized message for ONNX classifier"
        );

        let url = format!(
            "{}/api/sessions/{}/{}",
            self.base_url, self.model, self.version
        );
        let payload = serde_json::json!({
            "input_ids": [input_ids],
            "attention_mask": [attention_mask],
        });

        let response = self.http.post(&url).json(&payload).send().await?;
        if !response.status().is_success() {
            return Err(invalid(format!(
                "onnx server returned status {}",
                response.status()
            )));
        }

        let body: serde_json::Value = response.json().await?;
        let output = single_output_value(&body)?;
        let (not_spam_logit, spam_logit) = logits(&output)?;
        let spam_probability = stable_spam_probability(not_spam_logit, spam_logit);

        let verdict = if spam_probability >= self.spam_threshold {
            OnnxVerdict::Escalate
        } else {
            OnnxVerdict::Negative
        };

        Ok(OnnxOutcome {
            verdict,
            diagnostic: OnnxDiagnostic {
                model: self.model.clone(),
                version: self.version.clone(),
                spam_threshold: self.spam_threshold,
                spam_probability,
                not_spam_logit,
                spam_logit,
            },
        })
    }
}

pub fn encoding_to_tensor(ids: &[u32]) -> Vec<i64> {
    ids.iter().map(|&id| i64::from(id)).collect()
}

/// Stable softmax: max-subtraction keeps extreme logits from overflowing.
pub fn stable_spam_probability(not_spam_logit: f64, spam_logit: f64) -> f64 {
    let max = not_spam_logit.max(spam_logit);
    let not_spam = (not_spam_logit - max).exp();
    let spam = (spam_logit - max).exp();
    spam / (not_spam + spam)
}

/// Output name is the graph's, not stable: validate shape, ignore the name.
fn single_output_value(body: &serde_json::Value) -> Result<serde_json::Value, Error> {
    let map = body
        .as_object()
        .ok_or_else(|| invalid("onnx output must be a JSON object"))?;
    if map.len() != 1 {
        return Err(invalid(format!(
            "onnx output must contain exactly one tensor, found {}",
            map.len()
        )));
    }
    Ok(map.values().next().expect("len == 1").clone())
}

fn logits(output: &serde_json::Value) -> Result<(f64, f64), Error> {
    let rows = output
        .as_array()
        .ok_or_else(|| invalid("onnx output must be a nested array"))?;
    if rows.len() != 1 {
        return Err(invalid(format!(
            "onnx output must have exactly one row, found {}",
            rows.len()
        )));
    }
    let row = rows[0]
        .as_array()
        .ok_or_else(|| invalid("onnx output row must be an array"))?;
    if row.len() != 2 {
        return Err(invalid(format!(
            "onnx output row must contain 2 logits, found {}",
            row.len()
        )));
    }
    let not_spam = finite_number(&row[0], "not_spam logit")?;
    let spam = finite_number(&row[1], "spam logit")?;
    Ok((not_spam, spam))
}

fn finite_number(value: &serde_json::Value, kind: &str) -> Result<f64, Error> {
    let number = value
        .as_f64()
        .ok_or_else(|| invalid(format!("onnx {kind} must be a number")))?;
    if !number.is_finite() {
        return Err(invalid(format!("onnx {kind} must be finite")));
    }
    Ok(number)
}

fn validate_threshold(threshold: f64) -> Result<(), Error> {
    if !threshold.is_finite() || !(0.0..=1.0).contains(&threshold) {
        return Err(invalid("spam threshold must be finite and between 0 and 1"));
    }
    Ok(())
}

/// Plain HTTP allowed for local/internal servers; anything else rejected.
fn validate_onnx_url(input: &str) -> Result<String, Error> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(invalid("ONNX base URL must not be empty"));
    }
    let parsed = reqwest::Url::parse(trimmed)
        .map_err(|error| invalid(format!("ONNX base URL is malformed: {error}")))?;
    let scheme = parsed.scheme();
    if !matches!(scheme, "http" | "https") {
        return Err(invalid(format!(
            "ONNX base URL must use http or https, got {scheme}"
        )));
    }
    if parsed.host_str().is_none() {
        return Err(invalid("ONNX base URL must include a host"));
    }
    Ok(trimmed.trim_end_matches('/').to_string())
}

fn invalid(message: impl Into<String>) -> Error {
    std::io::Error::other(message.into()).into()
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::Duration;

    use super::{
        MAX_TOKENS, OnnxClassifier, OnnxVerdict, encoding_to_tensor, stable_spam_probability,
    };
    use crate::discord::spam::test_support::MockServer;

    const MINI_TOKENIZER: &str = include_str!("mini_tokenizer.json");

    // Each call gets its own file: tests construct classifiers concurrently.
    static TOKENIZER_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn tokenizer_path() -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("discord-bot-onnx-tests-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("create temp dir");
        let name = format!(
            "mini_tokenizer_{}.json",
            TOKENIZER_COUNTER.fetch_add(1, Ordering::SeqCst)
        );
        let path = dir.join(name);
        std::fs::write(&path, MINI_TOKENIZER).expect("write fixture tokenizer");
        path
    }

    fn classifier(base_url: &str) -> OnnxClassifier {
        classifier_with_threshold(base_url, 0.5)
    }

    fn classifier_with_threshold(base_url: &str, threshold: f64) -> OnnxClassifier {
        OnnxClassifier::new(
            base_url.to_string(),
            &tokenizer_path(),
            "tanaos-spam-detection-v1".to_string(),
            "v1".to_string(),
            threshold,
            Duration::from_secs(5),
        )
        .expect("classifier must construct")
    }

    #[test]
    fn softmax_is_stable_for_extreme_logits() {
        let probability = stable_spam_probability(1000.0, 1000.0);
        assert!((probability - 0.5).abs() < f64::EPSILON);

        let probability = stable_spam_probability(1000.0, 999.0);
        let expected = 1.0 / (1.0 + std::f64::consts::E);
        assert!((probability - expected).abs() < 1e-9);

        let probability = stable_spam_probability(0.0, 16.0);
        assert!(probability.is_finite());
        assert!(probability > 0.999_999);
    }

    #[test]
    fn tensor_conversion_preserves_ids_and_mask() {
        assert_eq!(encoding_to_tensor(&[0, 1, 2]), vec![0, 1, 2]);
        assert_eq!(encoding_to_tensor(&[u32::MAX]), vec![i64::from(u32::MAX)]);
    }

    #[test]
    fn rejects_out_of_range_threshold() {
        for threshold in [-0.01, 1.01, f64::NAN, f64::INFINITY] {
            assert!(
                OnnxClassifier::new(
                    "http://localhost:1".to_string(),
                    &tokenizer_path(),
                    "m".to_string(),
                    "v".to_string(),
                    threshold,
                    Duration::from_secs(1),
                )
                .is_err(),
                "threshold {threshold} must be rejected"
            );
        }
    }

    #[test]
    fn fails_when_tokenizer_missing() {
        let missing = std::env::temp_dir().join("does-not-exist-tokenizer.json");
        assert!(
            OnnxClassifier::new(
                "http://localhost:1".to_string(),
                &missing,
                "m".to_string(),
                "v".to_string(),
                0.5,
                Duration::from_secs(1),
            )
            .is_err()
        );
    }

    #[test]
    fn rejects_invalid_onnx_base_url() {
        for url in [
            "",
            "   ",
            "not a url",
            "ftp://localhost:8080",
            "file:///tmp/model",
        ] {
            assert!(
                OnnxClassifier::new(
                    url.to_string(),
                    &tokenizer_path(),
                    "m".to_string(),
                    "v".to_string(),
                    0.5,
                    Duration::from_secs(1),
                )
                .is_err(),
                "url {url:?} must be rejected at startup"
            );
        }
    }

    #[test]
    fn accepts_internal_http_and_https_onnx_base_url() {
        for url in [
            "http://127.0.0.1:38080/",
            "http://localhost:8080",
            "https://onnx.cluster.local",
        ] {
            assert!(
                OnnxClassifier::new(
                    url.to_string(),
                    &tokenizer_path(),
                    "m".to_string(),
                    "v".to_string(),
                    0.5,
                    Duration::from_secs(1),
                )
                .is_ok(),
                "url {url:?} must be accepted"
            );
        }
    }

    #[test]
    fn tokenizer_preserves_case() {
        let tokenizer = tokenizers::Tokenizer::from_file(tokenizer_path()).expect("load");
        let lower = tokenizer.encode("c", true).expect("encode");
        let upper = tokenizer.encode("C", true).expect("encode");
        assert_ne!(
            lower.get_ids(),
            upper.get_ids(),
            "lowercasing would collide"
        );
    }

    #[test]
    fn tokenizer_truncates_to_configured_max_length() {
        let mut tokenizer = tokenizers::Tokenizer::from_file(tokenizer_path()).expect("load");
        tokenizer
            .with_truncation(Some(tokenizers::TruncationParams {
                max_length: 8,
                ..Default::default()
            }))
            .expect("truncation");
        tokenizer.with_padding(None);

        let encoding = tokenizer
            .encode("a a a a a a a a a a a a a a", true)
            .expect("encode");
        assert_eq!(encoding.get_ids().len(), 8);
        assert_eq!(encoding.get_attention_mask().len(), 8);

        let length = tokenizer.encode("a b", true).expect("encode");
        assert!(length.get_ids().len() <= MAX_TOKENS);
        assert_eq!(length.get_ids().len(), length.get_attention_mask().len());
    }

    #[tokio::test]
    async fn onnx_negative_below_threshold() {
        let mock = MockServer::spawn(200, br#"{"logits":[[-3.0, -5.0]]}"#.to_vec()).await;
        let classifier = classifier(&mock.url());

        let outcome = classifier
            .classify("chill geo discussion")
            .await
            .expect("classify");
        assert_eq!(outcome.verdict, OnnxVerdict::Negative);
        assert!(outcome.diagnostic.spam_probability < 0.5);
        assert_eq!(outcome.diagnostic.model, "tanaos-spam-detection-v1");
    }

    #[tokio::test]
    async fn onnx_positive_escalates() {
        let mock = MockServer::spawn(200, br#"{"logits":[[-7.0, 7.0]]}"#.to_vec()).await;
        let classifier = classifier(&mock.url());

        let outcome = classifier.classify("buy now!!!").await.expect("classify");
        assert_eq!(outcome.verdict, OnnxVerdict::Escalate);
        assert!(outcome.diagnostic.spam_probability > 0.9);
    }

    #[tokio::test]
    async fn threshold_boundary_escalates_at_threshold() {
        // Equal logits yield exactly spam_probability == 0.5.
        let mock = MockServer::spawn(200, br#"{"logits":[[1.0, 1.0]]}"#.to_vec()).await;
        let classifier = classifier_with_threshold(&mock.url(), 0.5);

        let outcome = classifier.classify("boundary").await.expect("classify");
        assert_eq!(outcome.diagnostic.spam_probability, 0.5);
        assert_eq!(
            outcome.verdict,
            OnnxVerdict::Escalate,
            ">= threshold escalates"
        );

        // A threshold of 1.0 must never be reached by a finite softmax.
        let mock = MockServer::spawn(200, br#"{"logits":[[1.0, 1.0]]}"#.to_vec()).await;
        let classifier = classifier_with_threshold(&mock.url(), 1.0);
        let outcome = classifier.classify("boundary").await.expect("classify");
        assert_eq!(outcome.verdict, OnnxVerdict::Negative);
    }

    #[tokio::test]
    async fn onnx_sends_named_tensors_to_session_endpoint() {
        let mock = MockServer::spawn(200, br#"{"logits":[[-1.0,-1.0]]}"#.to_vec()).await;
        let classifier = classifier(&mock.url());

        classifier.classify("hello").await.expect("classify");

        let request = mock.requests();
        assert_eq!(request.len(), 1);
        assert_eq!(request[0].method, "POST");
        assert_eq!(request[0].path, "/api/sessions/tanaos-spam-detection-v1/v1");

        let body: serde_json::Value = serde_json::from_slice(&request[0].body).expect("json body");
        let ids = body
            .get("input_ids")
            .expect("input_ids")
            .as_array()
            .expect("array");
        assert_eq!(ids.len(), 1, "batch size one");
        let ids_row = ids[0].as_array().expect("ids row");
        assert!(!ids_row.is_empty());
        let mask_row = body["attention_mask"][0].as_array().expect("mask row");
        assert_eq!(
            mask_row.len(),
            ids_row.len(),
            "attention mask must track ids length (no padding)"
        );
        assert!(
            mask_row.iter().all(|value| value.as_i64() == Some(1)),
            "unpadded attention mask must be all ones"
        );

        for id in ids_row {
            assert!(id.as_i64().is_some(), "tensor must serialize as integers");
        }
    }

    #[tokio::test]
    async fn onnx_server_error_is_error() {
        let mock = MockServer::spawn(500, b"boom".to_vec()).await;
        let classifier = classifier(&mock.url());

        let error = classifier.classify("hello").await.expect_err("must error");
        assert!(error.to_string().contains("status 500"));
    }

    #[tokio::test]
    async fn onnx_wrong_shape_is_rejected() {
        for body in [
            br#"{"logits": [[0.1]]}"#.as_slice(),
            br#"{"logits": [[0.1, 0.2], [0.3, 0.4]]}"#,
            br#"{"logits": [0.1, 0.2]}"#,
            br#"{"logits": [[0.1, 0.2, 0.3]]}"#,
            br#"{}"#,
            br#"{"a": [[1.0, 2.0]], "b": [[3.0, 4.0]]}"#,
        ] {
            let mock = MockServer::spawn(200, body.to_vec()).await;
            let classifier = classifier(&mock.url());
            assert!(
                classifier.classify("hello").await.is_err(),
                "invalid response body must error"
            );
        }
    }

    #[tokio::test]
    async fn onnx_non_finite_logits_are_rejected() {
        for body in [
            br#"{"logits": [[NaN, 1.0]]}"#.as_slice(),
            br#"{"logits": [[1.0, Infinity]]}"#,
        ] {
            let mock = MockServer::spawn(200, body.to_vec()).await;
            let classifier = classifier(&mock.url());
            assert!(classifier.classify("hello").await.is_err());
        }
    }

    #[tokio::test]
    async fn onnx_redirects_are_disabled_and_never_followed() {
        // The ONNX client must treat any 3xx as an error and never replay the
        // token tensors to a foreign Location (SSRF guard).
        let reached_target = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let target = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind target");
        let target_addr = target.local_addr().expect("target addr");
        let target_task = {
            let reached_target = reached_target.clone();
            tokio::spawn(async move {
                if target.accept().await.is_ok() {
                    reached_target.store(true, std::sync::atomic::Ordering::SeqCst);
                }
            })
        };

        let redirect_server = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind redirect");
        let redirect_addr = redirect_server.local_addr().expect("addr");
        let handle = tokio::spawn(async move {
            let (mut stream, _) = redirect_server
                .accept()
                .await
                .expect("accept redirect connection");
            let mut buf = [0u8; 4096];
            let _ = tokio::io::AsyncReadExt::read(&mut stream, &mut buf).await;
            let location = format!("http://{target_addr}/api/sessions/m/v");
            let _ = tokio::io::AsyncWriteExt::write_all(
                &mut stream,
                format!(
                    "HTTP/1.1 307 Temporary Redirect\r\nLocation: {location}\r\nContent-Length: 0\r\n\r\n"
                )
                .as_bytes(),
            )
            .await;
        });

        let classifier = classifier_with_threshold(&format!("http://{redirect_addr}"), 0.5);
        let result = classifier.classify("hello").await;
        assert!(result.is_err(), "redirect must fail classification");
        handle.await.expect("redirect handler");

        // The target listener must never receive a connection.
        tokio::time::sleep(Duration::from_millis(80)).await;
        assert!(
            !reached_target.load(std::sync::atomic::Ordering::SeqCst),
            "client must not follow redirects"
        );
        target_task.abort();
    }
}
