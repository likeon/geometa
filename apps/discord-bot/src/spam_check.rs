//! Text-only check of every model. No Discord, ONNX, or moderation.

use std::fmt::Write;

use crate::Error;
use crate::config::{
    BotConfig, CouncilConfig, OpenRouterClassifierConfig, SpamPromptConfig, load_config,
};
use crate::discord::spam::council::{CouncilWorkflow, result_verdict};
use crate::discord::spam::input::PreparedInput;
use crate::discord::spam::openrouter::{OpenRouterBatchOutcome, OpenRouterResult};
use crate::discord::spam::{Classified, Verdict};

pub async fn run(text: &str) -> Result<(), Error> {
    let config = load_config()?;
    let workflow = prepare_classifier(&config)?;
    let result = workflow.classify_all(&PreparedInput::text(text)).await;
    println!("{}", format_result(&result, workflow.stage_two_threshold()));
    if result.verdict == Verdict::Indeterminate {
        return Err(
            std::io::Error::other("classification indeterminate; see stage results").into(),
        );
    }
    Ok(())
}

fn prepare_classifier(config: &BotConfig) -> Result<CouncilWorkflow, Error> {
    let default_classifier = OpenRouterClassifierConfig::default();
    let default_council = CouncilConfig::default();
    let default_prompt = SpamPromptConfig::default();
    let (settings, council, prompt) = config
        .spam_detection
        .as_ref()
        .map(|spam| (&spam.openrouter, &spam.council, &spam.prompt))
        .unwrap_or((&default_classifier, &default_council, &default_prompt));
    CouncilWorkflow::new(
        settings,
        council,
        prompt,
        config.services.openrouter_api_key()?,
    )
}

fn format_result(result: &Classified, threshold: f64) -> String {
    let mut output = String::new();
    let _ = writeln!(output, "stage_two:");
    format_batches(&mut output, &result.diagnostics.openrouter);
    let _ = writeln!(output, "  threshold: {threshold}");
    if result.diagnostics.council.is_empty() {
        let _ = writeln!(output, "council: no results");
    } else {
        let _ = writeln!(output, "council:");
        for vote in &result.diagnostics.council {
            let _ = writeln!(
                output,
                "  {}: model={} type={:?} verdict={}",
                vote.name,
                vote.model,
                vote.kind,
                verdict(result_verdict(&vote.result))
            );
            if let Some(threshold) = vote.threshold {
                let _ = writeln!(output, "  threshold: {threshold}");
            }
            let batches = match &vote.result {
                OpenRouterResult::Accepted { batches }
                | OpenRouterResult::Spam { batches }
                | OpenRouterResult::Indeterminate { batches, .. } => batches,
            };
            format_batches(&mut output, batches);
        }
    }
    for failure in &result.diagnostics.failures {
        let _ = writeln!(output, "failure: {failure}");
    }
    let _ = writeln!(output, "disagreement: {}", result.diagnostics.disagreement);
    let _ = write!(output, "verdict: {}", verdict(result.verdict));
    output
}

fn format_batches(output: &mut String, batches: &[OpenRouterBatchOutcome]) {
    for batch in batches {
        let _ = writeln!(
            output,
            "  model: {}\n  batch: {}/{}\n  decision: {:?}",
            batch.model,
            batch.batch_index + 1,
            batch.batch_count,
            batch.decision
        );
        if let Some(probability) = batch.spam_probability {
            let _ = writeln!(output, "  spam_probability: {probability}");
        }
    }
}

fn verdict(verdict: Verdict) -> &'static str {
    match verdict {
        Verdict::Accepted => "safe",
        Verdict::Spam => "spam",
        Verdict::Indeterminate => "indeterminate",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::DEFAULT_OPENROUTER_MODEL;
    use crate::discord::spam::ClassifierDiagnostics;
    use crate::discord::spam::openrouter::OpenRouterDecision;

    fn config() -> BotConfig {
        serde_json::from_value(
            serde_json::json!({"services": {"openrouter": {"api_key": "test-key"}}}),
        )
        .unwrap()
    }

    #[test]
    fn prepares_default_workflow_without_discord_or_onnx() {
        let config = config();
        assert!(config.spam_detection.is_none());
        assert!(config.discord.token.is_none());
        assert!(config.services.onnx.api_url.is_none());
        assert_eq!(
            prepare_classifier(&config).unwrap().stage_two_threshold(),
            0.9
        );
    }

    #[test]
    fn standalone_cli_uses_configured_prompt_and_rejects_blank_override() {
        let mut config: BotConfig = serde_json::from_value(serde_json::json!({
            "services": {"openrouter": {"api_key": "test-key"}},
            "spam_detection": {
                "mode": "alert", "guild_id": 1, "moderation_channel_id": 2,
                "onnx": {"model": "unused", "version": "unused"},
                "openrouter": {},
                "council": {"members": [{
                    "name": "review", "type": "decisions",
                    "model": DEFAULT_OPENROUTER_MODEL, "spam_threshold": 0.9,
                }]},
                "prompt": {"instructions": "Custom shared instructions."},
            },
        }))
        .unwrap();
        assert!(prepare_classifier(&config).is_ok());
        config.spam_detection.as_mut().unwrap().prompt.instructions = "  ".to_string();
        let error = prepare_classifier(&config)
            .err()
            .expect("blank prompt must fail");
        assert!(
            error
                .to_string()
                .contains("spam_detection.prompt.instructions")
        );
    }

    #[test]
    fn missing_key_is_error() {
        let mut config = config();
        config.services.openrouter.api_key = None;
        let error = prepare_classifier(&config).err().expect("missing key");
        assert!(error.to_string().contains("OPENROUTER_API_KEY"));
    }

    #[test]
    fn prints_exact_scores_and_missing_results() {
        let result = Classified {
            verdict: Verdict::Accepted,
            diagnostics: ClassifierDiagnostics {
                openrouter: vec![OpenRouterBatchOutcome {
                    batch_index: 0,
                    batch_count: 1,
                    decision: OpenRouterDecision::Safe,
                    spam_probability: Some(0.8999999),
                    model: DEFAULT_OPENROUTER_MODEL.to_string(),
                }],
                ..Default::default()
            },
        };
        let output = format_result(&result, 0.9);
        assert!(output.contains("spam_probability: 0.8999999"));
        assert!(output.contains("threshold: 0.9"));
        assert!(output.contains("council: no results"));
        assert!(output.ends_with("verdict: safe"));
    }

    #[test]
    fn prints_council_spam_override_of_safe_stage_two() {
        use crate::config::ModelKind;
        use crate::discord::spam::council::CouncilVote;

        let result = Classified {
            verdict: Verdict::Spam,
            diagnostics: ClassifierDiagnostics {
                openrouter: vec![OpenRouterBatchOutcome {
                    batch_index: 0,
                    batch_count: 1,
                    decision: OpenRouterDecision::Safe,
                    spam_probability: Some(0.1),
                    model: DEFAULT_OPENROUTER_MODEL.to_string(),
                }],
                council: vec![CouncilVote {
                    name: "review".to_string(),
                    model: "chat-model".to_string(),
                    kind: ModelKind::Chat,
                    threshold: None,
                    result: OpenRouterResult::Spam {
                        batches: vec![OpenRouterBatchOutcome {
                            batch_index: 0,
                            batch_count: 1,
                            decision: OpenRouterDecision::Unsafe,
                            spam_probability: None,
                            model: "chat-model".to_string(),
                        }],
                    },
                }],
                disagreement: true,
                ..Default::default()
            },
        };
        let output = format_result(&result, 0.9);
        assert!(output.contains("decision: Safe"));
        assert!(output.contains("spam_probability: 0.1"));
        assert!(output.contains("review: model=chat-model type=Chat verdict=spam"));
        assert!(output.contains("disagreement: true"));
        assert!(!output.contains("council: no results"));
        assert!(output.ends_with("verdict: spam"));
    }

    #[test]
    fn prints_failures_and_disagreement_without_claiming_safe() {
        let result = Classified {
            verdict: Verdict::Indeterminate,
            diagnostics: ClassifierDiagnostics {
                disagreement: true,
                failures: vec!["council unavailable".to_string()],
                ..Default::default()
            },
        };
        let output = format_result(&result, 0.9);
        assert!(output.contains("failure: council unavailable"));
        assert!(output.contains("disagreement: true"));
        assert!(output.ends_with("verdict: indeterminate"));
    }
}
