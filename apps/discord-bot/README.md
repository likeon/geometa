# GeoMeta Discord Bot

One Rust binary provides:

- the existing `/publish` command;
- a daily, button-only GeoGuessr challenge post.

The always-on Deployment runs the Discord gateway. A Kubernetes CronJob runs
`discord-bot challenge` at 12:00 Europe/Berlin, posts one challenge-link button
per configured pool, and exits.

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

game_modes:
  nm:
    settings:
      forbid_moving: true
      forbid_rotating: false
      forbid_zooming: false

pools:
  - name: Featured
    maps:
      - name: A Community World
        map_id: 62a44b22040f04bd36e8a914
        game_modes: [nm]

  - name: LearnableMeta
    learnable_meta:
      region: Europe
      is_shared: true
    game_modes: [nm]
```

Each pool must contain either static `maps` or `learnable_meta`. The
LearnableMeta filters are optional. At most 25 pools are supported because
Discord messages allow 25 buttons.

## Responsibilities

The bot selects maps and posts to Discord. It calls the in-cluster ALM API for
the map catalog and challenge creation. Only the ALM API communicates with
GeoGuessr and owns the `_ncfa` cookie.

## Optional spam detection

The gateway can moderate unverified messages with a two-stage pipeline:

1. Local first stage: the Tanaos `tanaos-spam-detection-v1` ONNX model
   (tokenizer + Kibaes ONNX Runtime Server). Only text messages run it.
2. Authoritative second stage: configured OpenRouter multimodal model reviews
   every ONNX-positive text message and every image message. Default:
   `xiaomi/mimo-v2.5`.

Verified users bypass the pipeline entirely. Detection failures **fail open**:
the message and user stay unchanged, no verification credit is granted, and
technical details stay in application logs. The moderation channel receives
only concise embeds for confirmed spam, with message text hidden behind a
spoiler preview.

### Configuration

Copy `config.example.yaml` to `config.yaml` and set guild/moderation channel
ids. `spam_detection.openrouter.model` selects model and defaults to
`xiaomi/mimo-v2.5`; selected model must support image input, reasoning control,
and structured outputs. Start with `mode: alert`; switching `mode: ban` bans
the offender with exact 15-minute message cleanup
(`delete_message_seconds=900`) and must only happen after a reviewed rollout
(see `.notes/ai/plans/discord-spam-detection.md`).

Required spam service values:

```text
SPAM_ONNX_API_URL          # overrides services.onnx.api_url
SPAM_ONNX_TOKENIZER_PATH   # overrides services.onnx.tokenizer_path
OPENROUTER_API_KEY         # overrides services.openrouter.api_key
```

Set them through environment variables (recommended, required for secrets) or
matching `services` keys in YAML. `DISCORD_TOKEN` similarly overrides
`discord.token`. Never commit real token values.

Classifier uses `https://openrouter.ai/api/v1/chat/completions` with text and
`image_url` content parts, deterministic temperature, configured model, and
strict structured output containing `{"verdict":"safe"}` or
`{"verdict":"unsafe"}`. Provider or protocol failures are fail-open and
indeterminate.

### Local ONNX server

Provision the pinned model artifacts (idempotent, checksum-verified):

```bash
scripts/process-compose/setup-discord-spam-model.sh
```

The `discord-bot-spam-detect-onnx` process in `process-compose.yaml` is
**disabled by default** (the model is ~136 MB and optional for ordinary
development). To run it, first run the setup script, then enable the process
(remove `disabled: true` or start it from the Process Compose TUI). The
service runs `kibaes/onnxruntime-server:1.29.0-linux-cpu`, preloads
`tanaos-spam-detection-v1:v1`, disables ONNX Runtime telemetry, and mounts
`.dev/data/onnx-runtime/models` read-only. `scripts/process-compose/run.sh`
allocates a dynamic port and persists `SPAM_ONNX_API_URL` and
`SPAM_ONNX_TOKENIZER_PATH` into the ignored `mise.local.toml`.

### Discord requirements

The gateway needs the **Message Content Intent** enabled in the Discord
Developer Portal (a privileged intent) in addition to its normal intents. The
bot role needs read/view permissions where messages are inspected, send +
attach-file permissions in the moderation channel, and the **Ban Members**
permission for `ban` mode. The role must sit above any user it may ban.

### Production handoff

Kubernetes deployment of the ONNX inference service, plus OpenRouter API
secret/network wiring, are deployment prerequisites handled outside this
repository (storage, resources, network policy, tokens).

Without a spam configuration the gateway still starts normally: when
`config.yaml` is absent (the current Deployment mounts none) spam detection
is simply disabled. To run the pipeline in production, operators must mount
a `config.yaml` with a `spam_detection` section (guild/moderation channel
IDs, `mode: alert` first) and provide three spam service values through env vars
or YAML; without them gateway fails fast rather than silently disabling spam
detection.

## Run

```bash
cargo run
cp config.example.yaml config.yaml # then set challenge.channel_id
cargo run -- challenge
```

Both modes require `DISCORD_TOKEN`. Production also sets `API_HOST=api` and
mounts a Kubernetes service-account token with audience `api`.

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
