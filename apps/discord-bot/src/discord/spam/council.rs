//! Independent council reviews. Gateway gates on spam; CLI inspects every model.

use futures_util::future::join_all;
use std::sync::Arc;
use tokio::sync::Semaphore;

use super::input::PreparedInput;
use super::openrouter::{OpenRouterClassifier, OpenRouterResult};
use super::{Classified, ClassifierDiagnostics, Verdict};
use crate::Error;
use crate::config::{
    Consensus, CouncilConfig, CouncilMemberConfig, ModelKind, OpenRouterClassifierConfig,
    SpamPromptConfig,
};

#[derive(Clone, Debug, PartialEq)]
pub struct CouncilVote {
    pub name: String,
    pub model: String,
    pub kind: ModelKind,
    pub threshold: Option<f64>,
    pub result: OpenRouterResult,
}

struct Member {
    config: CouncilMemberConfig,
    classifier: OpenRouterClassifier,
}

pub struct CouncilWorkflow {
    stage_two: OpenRouterClassifier,
    stage_two_threshold: f64,
    members: Vec<Member>,
    consensus: Consensus,
    capacity: Arc<Semaphore>,
    image_capacity: Semaphore,
}

enum CouncilTrigger {
    SpamOnly,
    Always,
}

impl CouncilWorkflow {
    pub fn new(
        settings: &OpenRouterClassifierConfig,
        council: &CouncilConfig,
        prompt: &SpamPromptConfig,
        api_key: &str,
    ) -> Result<Self, Error> {
        settings.validate()?;
        council.validate()?;
        prompt.validate()?;
        let members = council
            .members
            .iter()
            .map(|config| {
                Ok(Member {
                    config: config.clone(),
                    classifier: OpenRouterClassifier::council_member(
                        config, settings, prompt, api_key,
                    )?,
                })
            })
            .collect::<Result<Vec<_>, Error>>()?;
        Ok(Self {
            stage_two: OpenRouterClassifier::new(settings, prompt, api_key.to_owned())?,
            stage_two_threshold: settings.spam_threshold,
            members,
            consensus: council.consensus,
            capacity: Arc::new(Semaphore::new(settings.max_concurrency)),
            // Bound simultaneous base64/JSON copies under 256 MiB bot limit.
            image_capacity: Semaphore::new(2),
        })
    }

    pub fn stage_two_threshold(&self) -> f64 {
        self.stage_two_threshold
    }

    pub async fn classify(&self, input: &PreparedInput) -> Classified {
        self.classify_with_trigger(input, CouncilTrigger::SpamOnly)
            .await
    }

    /// CLI diagnostics: inspect every model, including after stage-two failures.
    pub async fn classify_all(&self, input: &PreparedInput) -> Classified {
        self.classify_with_trigger(input, CouncilTrigger::Always)
            .await
    }

    async fn classify_with_trigger(
        &self,
        input: &PreparedInput,
        trigger: CouncilTrigger,
    ) -> Classified {
        let stage_two = self.run_model(&self.stage_two, input).await;
        let (stage_two_verdict, batches, failures) = unpack(stage_two);
        let mut diagnostics = ClassifierDiagnostics {
            openrouter: batches,
            failures,
            ..Default::default()
        };
        if matches!(trigger, CouncilTrigger::SpamOnly) && stage_two_verdict != Verdict::Spam {
            return Classified {
                verdict: stage_two_verdict,
                diagnostics,
            };
        }
        // Each member receives only original input and policy, never other votes.
        diagnostics.council = join_all(self.members.iter().map(|member| async {
            CouncilVote {
                name: member.config.name.clone(),
                model: member.config.model.clone(),
                kind: member.config.kind,
                threshold: member.config.spam_threshold,
                result: self.run_model(&member.classifier, input).await,
            }
        }))
        .await;
        let verdicts: Vec<_> = diagnostics
            .council
            .iter()
            .map(|vote| result_verdict(&vote.result))
            .collect();
        let council_disagrees =
            verdicts.contains(&Verdict::Spam) && verdicts.contains(&Verdict::Accepted);
        let contradicts_stage_two = stage_two_verdict != Verdict::Indeterminate
            && verdicts
                .iter()
                .any(|vote| *vote != Verdict::Indeterminate && *vote != stage_two_verdict);
        diagnostics.disagreement = council_disagrees || contradicts_stage_two;
        for vote in &diagnostics.council {
            if let OpenRouterResult::Indeterminate { failures, .. } = &vote.result {
                diagnostics.failures.extend(
                    failures
                        .iter()
                        .map(|failure| format!("council {}: {failure}", vote.name)),
                );
            }
        }
        Classified {
            verdict: if stage_two_verdict == Verdict::Indeterminate {
                Verdict::Indeterminate
            } else {
                consensus_verdict(self.consensus, &verdicts)
            },
            diagnostics,
        }
    }

    async fn run_model(
        &self,
        classifier: &OpenRouterClassifier,
        input: &PreparedInput,
    ) -> OpenRouterResult {
        let _image_permit = if input.images.is_empty() {
            None
        } else {
            Some(
                self.image_capacity
                    .acquire()
                    .await
                    .expect("private image semaphore stays open"),
            )
        };
        let Ok(_permit) = self.capacity.acquire().await else {
            return OpenRouterResult::Indeterminate {
                batches: vec![],
                failures: vec!["OpenRouter capacity closed".to_string()],
            };
        };
        classifier.classify_prepared(input).await
    }
}

pub fn result_verdict(result: &OpenRouterResult) -> Verdict {
    match result {
        OpenRouterResult::Spam { .. } => Verdict::Spam,
        OpenRouterResult::Accepted { .. } => Verdict::Accepted,
        OpenRouterResult::Indeterminate { .. } => Verdict::Indeterminate,
    }
}

fn unpack(
    result: OpenRouterResult,
) -> (
    Verdict,
    Vec<super::openrouter::OpenRouterBatchOutcome>,
    Vec<String>,
) {
    let verdict = result_verdict(&result);
    match result {
        OpenRouterResult::Spam { batches } | OpenRouterResult::Accepted { batches } => {
            (verdict, batches, vec![])
        }
        OpenRouterResult::Indeterminate { batches, failures } => (verdict, batches, failures),
    }
}

fn consensus_verdict(policy: Consensus, votes: &[Verdict]) -> Verdict {
    if votes.is_empty() || votes.contains(&Verdict::Indeterminate) {
        return Verdict::Indeterminate;
    }
    let spam = votes.iter().filter(|&&vote| vote == Verdict::Spam).count();
    let safe = votes.len() - spam;
    match policy {
        Consensus::Unanimous if spam == votes.len() => Verdict::Spam,
        Consensus::Unanimous if safe == votes.len() => Verdict::Accepted,
        Consensus::Majority if spam > votes.len() / 2 => Verdict::Spam,
        Consensus::Majority if safe > votes.len() / 2 => Verdict::Accepted,
        _ => Verdict::Indeterminate,
    }
}

#[cfg(test)]
#[path = "council_tests.rs"]
mod tests;
