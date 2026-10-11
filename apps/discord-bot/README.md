# GeoMeta Discord Bot

One Rust binary provides:

- the existing `/publish` command;
- a daily GeoGuessr challenge embed;
- text-only OpenRouter spam-check CLI.

The always-on Deployment runs the Discord gateway. A Kubernetes CronJob runs
`discord-bot challenge` at 12:00 Europe/Berlin, posts one embed containing
Beginner, Intermediate, and Advanced groups with two linked map names and
bold author credits each, and exits.

## Configuration

Configuration loads once through global `LazyLock`. `config.yaml` is optional
for gateway mode and required by challenge settings. Selected environment
variables override matching YAML values, so values exported by
`mise.local.toml` merge with file configuration. Production generates a
Kubernetes ConfigMap from `flux/config.yaml` and mounts it at that path:

```yaml
challenge:
  channel_id: 123456789012345678
  time_limit: 0
  game_mode: nm

game_modes:
  nm:
    settings:
      forbid_moving: true
      forbid_rotating: false
      forbid_zooming: false
```

The ALM API selects six eligible maps: two for each difficulty. Eligible maps
are published, non-personal, and belong to map groups recently synchronized by
the userscript. Selection is weighted toward maps used less recently, then
persisted in PostgreSQL before GeoGuessr challenges are created. One durable
batch is reused per Berlin calendar day; retries resume only missing challenge URLs.

## Responsibilities

The bot requests one generated daily batch and posts it to Discord. The ALM API
owns map selection, rotation history, and GeoGuessr challenge creation. Only
the ALM API communicates with GeoGuessr and owns the `_ncfa` cookie.

## Optional spam detection

Unverified messages follow three stages:

1. Text-only ONNX screen: Tanaos `tanaos-spam-detection-v1` via tokenizer +
   Kibaes ONNX Runtime Server. Images bypass ONNX.
2. Decisions model: default `openai/gpt-6-luna-decisions`, spam at probability
   `>= 0.9`. Only spam-positive results reach council.
3. Independent council: configured chat and/or decision models review same
   text and images, without seeing stage-two result or other members' votes.

Verified users bypass pipeline. Classification errors fail open: no ban or
verification credit. Accepted results retain existing per-message credit rules;
model deduplication does not bypass per-sender verification or freshness checks.

### Configuration and voting

Copy `config.example.yaml` to `config.yaml`; set guild/moderation channel IDs.
`spam_detection.openrouter` configures stage two, image limits, and shared model
concurrency. Selected stage-two model must support Decisions API, `noul`, and
images. `spam_threshold` defaults to `0.9`, inclusive; valid range `0..=1`.
Threshold remains uncalibrated against server messages.

`spam_detection.prompt` supplies shared policy to stage two and every council
member. Fields: `instructions`, `spam_criteria`, `safe_criteria`. Omitted fields
retain current built-in wording; explicit blanks, nulls, or unknown fields fail
validation. YAML `|-` blocks preserve multiline text without trailing newline.
API-specific response schemas and formatting instructions stay in adapters.
Restart gateway after config edits; CLI reloads config on each run.

`spam_detection.council` is required when spam detection configured. Define
1–8 members, each with unique `name`, explicit `type: chat | decisions`,
`model`, and optional `timeout_seconds` (default 60; range 1–300).
Decision members require `spam_threshold`; chat members must omit it.
Example/production council: `xiaomi/mimo-v2.5` chat review plus independent
`openai/gpt-6-luna-decisions` review at `0.9`.

Each member contributes one vote, not one vote per image batch. Every batch
reviewed: any failed batch makes member indeterminate; otherwise any spam batch
means spam, and all-safe batches mean safe. No averaging probabilities across
models. Stage two does not vote in council.

| Council result, default `consensus: unanimous` | Final result |
| --- | --- |
| All spam | Existing alert/ban workflow |
| All safe | Accepted; disagreement report because stage two said spam |
| Mixed spam/safe | Indeterminate; disagreement report, no enforcement/credit |
| Any failed member | Indeterminate; never count failure as safe |

Optional `consensus: majority` requires more than half of all members to agree.
Ties and any failed member remain indeterminate. Dissent still triggers
disagreement report when majority confirms spam. No automatic provider/model
fallback after invalid answers.

Start with `mode: alert`. `mode: ban` bans eligible offender with exact
15-minute cleanup (`delete_message_seconds=900`); enable only after reviewed
rollout (see `.notes/ai/plans/discord-spam-detection.md`).

Required spam service values:

```text
SPAM_ONNX_API_URL          # overrides services.onnx.api_url
SPAM_ONNX_TOKENIZER_PATH   # overrides services.onnx.tokenizer_path
OPENROUTER_API_KEY         # overrides services.openrouter.api_key
```

Set via environment (recommended; required for secrets) or matching `services`
YAML keys. `DISCORD_TOKEN` overrides `discord.token`. Never commit real tokens.

### Model requests and images

Decision adapter uses `https://openrouter.ai/api/alpha/decisions`:
`state` holds text/inline images; `questions.is_spam` holds GeoGuessr spam policy
as `noul` instructions and true/false criteria. Response
`answers.is_spam.noul` must be numeric probability within `0..=1`.

Chat adapter uses `https://openrouter.ai/api/v1/chat/completions` with same policy
and inline images. Requires strict structured `{"verdict":"safe"|"spam"}`
output. Refusals, truncated output, tool calls, and malformed JSON fail open.
Chat verdicts have no invented probability.

Images downloaded only from allowed Discord CDN hosts, without redirects.
Private temporary files supply identical bytes to stage two, council, and
evidence uploads. Reuploaded images may need fresh download to prove equality;
models never re-fetch remote image URLs.
`max_image_bytes` (default 20 MiB) caps each attachment and combined raw bytes
per model batch; `max_images_per_request` also bounds batches.
Actual downloaded sizes and file signatures validated. PNG/JPEG/WebP encoded
as base64 data URLs; GIF/unsupported formats stay indeterminate.

One image-bearing message prepares/classifies/reports at a time to bound
temporary disk. Shared `openrouter.max_concurrency` limits model checks across
stage two and council; image-bearing checks additionally capped at two to
bound base64/JSON memory. Each model's `timeout_seconds` bounds its whole check,
including all image batches, after obtaining concurrency permit.
Initial CDN downloads have separate 60-second per-file timeout.

Image wire format follows [OpenRouter multimodal Decisions guide](https://openrouter.ai/docs/guides/community/multimodal-decisions).

### Duplicate checks and reports

Recent-content identity: guild ID + exact text + ordered image-byte hashes.
Channel, sender, filenames, and signed CDN URLs do not affect identity.
Same caption with different image bytes remains separate. No fuzzy matching.

`spam_detection.recent_checks` defaults:
- `ttl_seconds: 600`: fixed group window from first completed check; repeated
  copies do not extend history forever.
- `failure_cooldown_seconds: 30`: failed checks retry after cooldown; ordinary
  council disagreements retain full cache lifetime.
- `max_entries: 1024`: new content fails open when registry full.

Queued/running checks share one result, including ONNX and council work.
Active checks cannot be evicted mid-classification. Cancellation releases
ownership so another waiter can retry. Cache/history in memory only; restart
clears both. After group expires, new occurrence starts new check/report.

Configured `moderation_channel_id` receives one main embed per recent content
group, updated in place with author, channel, message links, count, model
votes/probabilities, final verdict, and per-message action. Message text remains
spoiler-hidden. Replayed message IDs do not increase count.

Council disagreement—including unanimous safe overriding stage-two spam—uses
**Classification disagreement**, not confirmed-spam title. Operational failure
details stay in logs. Individual image-batch probabilities remain in diagnostics;
embed shows each member's maximum batch probability.

Concurrent arrivals coalesce. Create retries use stable enforced nonce;
edit failures retry same post. Only confirmed deleted report is recreated.
When links exceed embed capacity, same report carries updated
`flagged-messages.txt` with complete list. Preserved images sent sequentially,
once per group, with link to main report.

Per-occurrence freshness and verification gates remain. Edited content gets
new identity; changed/deleted snapshots can be listed but never justify stale
enforcement. Successful bans remembered per sender within group, preventing
duplicate ban calls. Different eligible senders remain independently actionable.

### Local ONNX server

Provision the pinned model artifacts (idempotent, checksum-verified):

```bash
scripts/pitchfork/setup-discord-spam-model.sh
```

`discord-bot-spam-detect-onnx` in `pitchfork.toml` stays **stopped by default**;
model ~136 MB, optional for ordinary development. Provision artifacts first,
then start service from Pitchfork TUI or `pitchfork start discord-bot-spam-detect-onnx`
during `mise run run` session. No config edit needed; service excluded from dev group.

Service runs `kibaes/onnxruntime-server:1.29.0-linux-cpu`, preloads
`tanaos-spam-detection-v1:v1`, disables ONNX Runtime telemetry, mounts
`.dev/data/onnx-runtime/models` read-only. `scripts/pitchfork/run.sh` allocates
preferred port or random fallback, persists `SPAM_ONNX_API_URL` and
`SPAM_ONNX_TOKENIZER_PATH` into ignored `mise.local.toml`.

Discord bot also manual-only. Start from TUI or `pitchfork start discord-bot`;
API readiness gates startup. Running bot restarts on Cargo manifest/lockfile
changes with `cargo run --locked`; stopped bot stays stopped.

### Discord requirements

The gateway needs the **Message Content Intent** enabled in the Discord
Developer Portal (a privileged intent) in addition to its normal intents. The
bot role needs read/view permissions where messages are inspected, send +
attach-file permissions in the moderation channel, and the **Ban Members**
permission for `ban` mode. The role must sit above any user it may ban.

### Production deployment

Flux runs the ONNX Runtime Server as a gateway sidecar. An init container
checksum-verifies the pinned tokenizer and model revision before storing them
in the `discord-bot-model-cache` PVC. The gateway reads the tokenizer from the
same volume and reaches ONNX over pod-local HTTP. Required external egress is
restricted by the app's Cilium network policy.

Production configuration lives in `flux/config.yaml` and starts in `alert`
mode. The Deployment supplies the ONNX URL and tokenizer path. Add
`OPENROUTER_API_KEY` to the existing encrypted `discord-bot` Secret alongside
`DISCORD_TOKEN`; never commit either plaintext value. Missing dependencies
make the gateway fail fast rather than silently disabling spam detection.

## Run

```bash
cargo run
cp config.example.yaml config.yaml # then set challenge.channel_id
cargo run -- challenge
```

Gateway and challenge modes require `DISCORD_TOKEN`. Production also sets
`API_HOST=api` and mounts a Kubernetes service-account token with audience `api`.

### Test message text

From `apps/discord-bot/`, with `OPENROUTER_API_KEY` set:

```bash
cargo run -- spam-check "Hello! Any tips for learning GeoGuessr?"
```

One quoted, non-empty message argument. For text starting with `-`, use
`cargo run -- spam-check -- "--message text"`. Runs real stage-two Decisions
check, then **every configured council member**, even after safe or failed
stage-two result. CLI-only diagnostic behavior; Discord gateway still gates
council on spam-positive stage two. Same bot policy; skips ONNX, Discord,
images, and moderation actions.
Message text is sent to OpenRouter; normal API charges apply.

Prints stage-two result, each council member's model/verdict, decision scores
and thresholds, disagreement flag, failures, and final verdict. stdout holds
results; stderr holds logs. Safe/spam exit zero. Indeterminate prints diagnostics
then exits nonzero, including council disagreement under unanimous policy.
Council determines final verdict when stage two succeeds; stage-two failure
keeps final result indeterminate even after successful council reviews.
Disagreement detects opposite verdicts between stages or among council members.

Uses `spam_detection.openrouter`, `spam_detection.council`, and shared
`spam_detection.prompt` from optional `config.yaml`. With no spam config,
defaults match stage two, mixed council, and built-in policy shown above.
Only OpenRouter key required: environment override or
`services.openrouter.api_key`. No Discord token, ONNX service, or ALM API needed.
`clap` generates help and argument errors. `cargo run -- --help` and
`cargo run -- spam-check --help` show usage without loading config or calling
services. Invalid arguments exit `2`; runtime failures exit `1`.

## Logging

Application targets log at `info` by default; dependency targets log at
`warn`. Override both with `RUST_LOG`, for example:

```bash
RUST_LOG=debug cargo run
RUST_LOG=warn,discord_bot=trace cargo run
```

## Check

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
