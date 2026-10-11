//! ONNX screening, decision model, mixed-model council, grouped moderation.

mod chat;
pub mod council;
pub mod dispatch;
pub mod evidence;
pub mod grouped_report;
mod image_input;
pub mod input;
pub mod moderation;
pub mod onnx;
pub mod openrouter;
pub mod recent;

#[cfg(test)]
pub(crate) mod test_support;

pub const ALLOWED_IMAGE_HOSTS: &[&str] = &["cdn.discordapp.com", "media.discordapp.net"];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImageRef {
    pub url: String,
    pub filename: String,
    pub content_type: Option<String>,
    pub declared_size: Option<u64>,
    /// Lets us recognize images whose MIME or extension is uninformative.
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Verdict {
    Accepted,
    Spam,
    /// Dependency/fetch failure, invalid response, unsupported image, or
    /// stale input. Never treated as accepted.
    Indeterminate,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct ClassifierDiagnostics {
    pub onnx: Option<onnx::OnnxDiagnostic>,
    pub openrouter: Vec<openrouter::OpenRouterBatchOutcome>,
    pub council: Vec<council::CouncilVote>,
    pub disagreement: bool,
    pub failures: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Classified {
    pub verdict: Verdict,
    pub diagnostics: ClassifierDiagnostics,
}
