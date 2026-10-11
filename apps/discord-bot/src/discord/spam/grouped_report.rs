//! One edited moderation report per recent content group.

use std::collections::{BTreeMap, HashSet};
use std::sync::Mutex;
use std::time::Duration;

use poise::serenity_prelude as serenity;
use serenity::builder::{
    CreateAttachment, CreateEmbed, CreateMessage, EditAttachments, EditMessage,
};
use serenity::model::channel::Nonce;
use serenity::model::id::MessageId;
use tokio::sync::Mutex as AsyncMutex;

use super::council::result_verdict;
use super::evidence::{
    AlertReporter, Enforcement, EvidenceMeta, ReportOutcome, StoredImage, build_alert_embed,
    message_link, no_mentions,
};
use super::{Classified, Verdict};

pub struct ReportGroup {
    first_message: u64,
    state: Mutex<State>,
    delivery: AsyncMutex<Delivery>,
}

#[derive(Default)]
struct State {
    meta: Option<EvidenceMeta>,
    classified: Option<Classified>,
    occurrences: BTreeMap<u64, Occurrence>,
    revision: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct Occurrence {
    author: u64,
    channel: u64,
    enforcement: Enforcement,
}

#[derive(Default)]
struct Delivery {
    message: Option<MessageId>,
    revision: u64,
    evidence_sent: HashSet<usize>,
    generation: u32,
    create_attempted: bool,
}

struct Rendered {
    embed: CreateEmbed,
    full_list: Option<String>,
    revision: u64,
}

impl ReportGroup {
    pub fn new(first_message: u64) -> Self {
        Self {
            first_message,
            state: Mutex::new(State::default()),
            delivery: AsyncMutex::new(Delivery::default()),
        }
    }

    fn record(&self, meta: &EvidenceMeta, classified: &Classified, enforcement: &Enforcement) {
        let mut state = self.state.lock().expect("report mutex poisoned");
        if state.meta.is_none() {
            state.meta = Some(meta.clone());
        }
        let occurrence = Occurrence {
            author: meta.author_id,
            channel: meta.channel_id,
            enforcement: enforcement.clone(),
        };
        // Replayed IDs never add occurrences; action changes still edit report.
        let changed = state.occurrences.get(&meta.message_id) != Some(&occurrence);
        state.occurrences.insert(meta.message_id, occurrence);
        if changed || state.classified.as_ref() != Some(classified) {
            state.revision += 1;
        }
        state.classified = Some(classified.clone());
    }

    fn render(&self) -> Rendered {
        let state = self.state.lock().expect("report mutex poisoned");
        let meta = state
            .meta
            .as_ref()
            .expect("report recorded before rendering");
        let classified = state
            .classified
            .as_ref()
            .expect("report has classification");
        let disagreement = classified.diagnostics.disagreement;
        let heading = if disagreement {
            "⚖ Classification disagreement"
        } else {
            "🚨 Spam detected"
        };
        let summary_action = if state
            .occurrences
            .values()
            .any(|item| item.enforcement == Enforcement::ConfirmedBan)
        {
            Enforcement::ConfirmedBan
        } else if state
            .occurrences
            .values()
            .any(|item| matches!(item.enforcement, Enforcement::BanFailed(_)))
        {
            Enforcement::BanFailed(String::new())
        } else if state
            .occurrences
            .values()
            .all(|item| item.enforcement == Enforcement::AlertOnly)
        {
            Enforcement::AlertOnly
        } else {
            Enforcement::NotApplied("see occurrences".to_string())
        };
        let mut embed = build_alert_embed(meta, &summary_action)
            .title(format!("{heading} — {} messages", state.occurrences.len()))
            .colour(if disagreement { 0xF0B232 } else { 0xED4245 })
            .field("Final verdict", verdict_label(classified.verdict), true);
        let stage = classified
            .diagnostics
            .openrouter
            .iter()
            .map(|batch| {
                format!(
                    "{}: {:?}, p={}",
                    short(&batch.model, 60),
                    batch.decision,
                    batch
                        .spam_probability
                        .map(|value| value.to_string())
                        .unwrap_or_else(|| "n/a".to_string())
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        embed = embed.field("Stage two", short(&stage, 1000), false);
        let votes = classified
            .diagnostics
            .council
            .iter()
            .map(|vote| {
                let batches = match &vote.result {
                    super::openrouter::OpenRouterResult::Accepted { batches }
                    | super::openrouter::OpenRouterResult::Spam { batches }
                    | super::openrouter::OpenRouterResult::Indeterminate { batches, .. } => batches,
                };
                let probability = batches
                    .iter()
                    .filter_map(|batch| batch.spam_probability)
                    .reduce(f64::max);
                let score = probability
                    .map(|p| format!(", max p={p:.4}"))
                    .unwrap_or_default();
                let threshold = vote
                    .threshold
                    .map(|t| format!(", threshold={t:.4}"))
                    .unwrap_or_default();
                format!(
                    "{} / {} ({:?}): {}{score}{threshold}",
                    short(&vote.name, 16),
                    short(&vote.model, 32),
                    vote.kind,
                    verdict_label(result_verdict(&vote.result))
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        embed = embed.field("Council", short(&votes, 1000), false);
        let mut shown = String::new();
        let mut complete = String::new();
        let mut displayed = 0;
        for (&message_id, occurrence) in &state.occurrences {
            let link = message_link(meta.guild_id, occurrence.channel, message_id);
            let action = action(&occurrence.enforcement);
            let line = format!(
                "[Message]({link}) · <@{}> · <#{}> · {action}\n",
                occurrence.author, occurrence.channel
            );
            complete.push_str(&format!(
                "{link} | author={} | channel={} | {action}\n",
                occurrence.author, occurrence.channel
            ));
            if shown.encode_utf16().count() + line.encode_utf16().count() <= 900 {
                shown.push_str(&line);
                displayed += 1;
            }
        }
        let overflow = displayed < state.occurrences.len();
        if overflow {
            shown.push_str("Full occurrence list attached; no links omitted there.");
        }
        embed = embed.field("Flagged messages / per-message action", shown, false);
        if !classified.diagnostics.failures.is_empty() {
            embed = embed.field(
                "Review failure",
                "Some checks failed. Details in application logs; failures are not safe votes.",
                false,
            );
        }
        Rendered {
            embed,
            full_list: overflow.then_some(complete),
            revision: state.revision,
        }
    }
}

fn verdict_label(verdict: Verdict) -> &'static str {
    match verdict {
        Verdict::Accepted => "safe",
        Verdict::Spam => "spam",
        Verdict::Indeterminate => "indeterminate",
    }
}

fn action(enforcement: &Enforcement) -> String {
    match enforcement {
        Enforcement::AlertOnly => "alert only".to_string(),
        Enforcement::ConfirmedBan => "author banned".to_string(),
        Enforcement::BanFailed(_) => "ban failed; review required".to_string(),
        Enforcement::NotApplied(reason) => short(reason, 70),
    }
}

fn short(value: &str, units: usize) -> String {
    let mut used = 0;
    let mut output = String::new();
    for ch in value.chars() {
        if used + ch.len_utf16() > units.saturating_sub(1) {
            output.push('…');
            return output;
        }
        output.push(ch);
        used += ch.len_utf16();
    }
    if output.is_empty() {
        "not run".to_string()
    } else {
        output
    }
}

fn missing_message(error: &serenity::Error) -> bool {
    matches!(error, serenity::Error::Http(serenity::http::HttpError::UnsuccessfulRequest(response)) if response.error.code == 10008)
}

fn attachment(rendered: &Rendered) -> Option<CreateAttachment> {
    rendered
        .full_list
        .as_ref()
        .map(|list| CreateAttachment::bytes(list.as_bytes().to_vec(), "flagged-messages.txt"))
}

impl AlertReporter {
    pub async fn report_group(
        &self,
        group: &ReportGroup,
        meta: &EvidenceMeta,
        classified: &Classified,
        enforcement: &Enforcement,
        images: &[StoredImage],
    ) -> ReportOutcome {
        group.record(meta, classified, enforcement);
        let mut delivery = group.delivery.lock().await;
        let dirty = group.state.lock().expect("report mutex poisoned").revision > delivery.revision;
        if !dirty
            && images
                .iter()
                .enumerate()
                .all(|(index, _)| delivery.evidence_sent.contains(&index))
        {
            return ReportOutcome::default();
        }
        // Concurrent arrivals record before locking; one edit includes whole burst.
        if dirty {
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        let rendered = group.render();
        let mut outcome = ReportOutcome::default();
        if delivery.revision < rendered.revision {
            if let Some(message_id) = delivery.message {
                let mut attachments = EditAttachments::new();
                if let Some(file) = attachment(&rendered) {
                    attachments = attachments.add(file);
                }
                let edit = EditMessage::new()
                    .embed(rendered.embed.clone())
                    .allowed_mentions(no_mentions())
                    .attachments(attachments);
                match self
                    .moderation_channel
                    .edit_message(&self.http, message_id, edit)
                    .await
                {
                    Ok(_) => delivery.revision = rendered.revision,
                    Err(error) if missing_message(&error) => {
                        delivery.message = None;
                        delivery.generation += 1;
                        delivery.create_attempted = false;
                    }
                    Err(error) => {
                        outcome.post_error = Some(format!("cannot edit grouped report: {error}"));
                        return outcome;
                    }
                }
            }
            if delivery.message.is_none() {
                let recovering = delivery.create_attempted;
                delivery.create_attempted = true;
                let nonce = format!("{:016x}r{:x}", group.first_message, delivery.generation);
                let mut message = CreateMessage::new()
                    .embed(rendered.embed.clone())
                    .allowed_mentions(no_mentions())
                    .nonce(Nonce::String(nonce))
                    .enforce_nonce(true);
                if let Some(file) = attachment(&rendered) {
                    message = message.add_file(file);
                }
                match self
                    .moderation_channel
                    .send_message(&self.http, message)
                    .await
                {
                    Ok(message) => {
                        delivery.message = Some(message.id);
                        outcome.posts_sent = 1;
                        if recovering {
                            // Enforced nonce may return older post after lost response.
                            // Patch latest state before marking current revision delivered.
                            let mut files = EditAttachments::new();
                            if let Some(file) = attachment(&rendered) {
                                files = files.add(file);
                            }
                            let edit = EditMessage::new()
                                .embed(rendered.embed.clone())
                                .allowed_mentions(no_mentions())
                                .attachments(files);
                            if let Err(error) = self
                                .moderation_channel
                                .edit_message(&self.http, message.id, edit)
                                .await
                            {
                                outcome.post_error =
                                    Some(format!("cannot refresh recovered report: {error}"));
                                return outcome;
                            }
                        }
                        delivery.revision = rendered.revision;
                    }
                    Err(error) => {
                        outcome.post_error = Some(format!("cannot create grouped report: {error}"));
                        return outcome;
                    }
                }
            }
        }
        // Existing evidence format stays sequential, once per content group.
        for (index, image) in images.iter().enumerate() {
            if delivery.evidence_sent.contains(&index) {
                continue;
            }
            let file = match CreateAttachment::path(image.path()).await {
                Ok(file) => file,
                Err(error) => {
                    outcome
                        .image_errors
                        .push(format!("cannot read {}: {error}", image.filename()));
                    continue;
                }
            };
            let report_id = delivery.message.expect("report exists before evidence");
            let message = CreateMessage::new()
                .content(format!(
                    "Preserved evidence {}/{} for {}",
                    index + 1,
                    images.len(),
                    message_link(
                        meta.guild_id,
                        self.moderation_channel.get(),
                        report_id.get()
                    )
                ))
                .allowed_mentions(no_mentions())
                .add_file(file)
                .nonce(Nonce::String(format!(
                    "{:016x}i{:x}",
                    group.first_message, index
                )))
                .enforce_nonce(true);
            match self
                .moderation_channel
                .send_message(&self.http, message)
                .await
            {
                Ok(_) => {
                    delivery.evidence_sent.insert(index);
                }
                Err(error) => outcome
                    .image_errors
                    .push(format!("cannot post evidence {}: {error}", index + 1)),
            }
        }
        outcome
    }
}

#[cfg(test)]
#[path = "grouped_report_tests.rs"]
mod tests;
