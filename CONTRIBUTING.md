# Contributing to Learnable Meta

Thank you for your interest in contributing! We welcome contributions from the community to make this project better.

## Contribution Guidelines

- If you plan to introduce breaking or intrusive changes, we recommend bringing them up in [Discord] or opening a [GitHub Discussion][gh-discussion] first.
- Follow git Conventional Commits guidelines for consistent commit messages

## Development setup

Installation is tested to work on Linux and Windows WSL. Mac OS should work too, but exact installations steps could differ.

### System dependencies

1. Install [mise CLI][mise] and [activate][mise-activate] it in your shell
2. Install [podman] or [docker]
3. Install postgres client `psql`

### Project setup

Run the following installation commands in order.

1. `mise bootstrap` — install monorepo runtimes + tools from [mise.toml](./mise.toml), Git hooks, lockfile-based package dependencies;
2. `just run` — start local services
3. In another mise-activated terminal: `just api::db-init` — apply initial DB data.

### Product documentation

The user-facing product documentation is served at `/docs`. Its MDsveX source
lives under `apps/frontend/src/routes/(public)/docs` and runs with the normal
frontend. Use `npm run dev`, `npm run test:docs`, and `npm run build` from
`apps/frontend` when editing it. The Scalar API reference at `/docs/api` uses
the OpenAPI document served at `/api/docs/json`.

### Optional: local spam-detection model

The Discord bot's spam pipeline needs a pinned ONNX model locally. This is
your choice; normal frontend/API development does not need it.

1. `scripts/pitchfork/setup-discord-spam-model.sh` — download and checksum-verify
   model/tokenizer into ignored `.dev/data/onnx-runtime/` (idempotent, ~136 MB).
2. During run session, start `discord-bot-spam-detect-onnx` from Pitchfork TUI or
   `pitchfork start discord-bot-spam-detect-onnx`; excluded from default dev group.
3. Runner persists `SPAM_ONNX_API_URL` and `SPAM_ONNX_TOKENIZER_PATH` into ignored
   `mise.local.toml` and prints ONNX endpoint.

## Pull Request Process

- Clearly describe the problem or feature in your pull request
- Provide steps to reproduce and test your changes if applicable
- Ensure that your branch is up-to-date with the latest changes from the main branch
- All checks (formatting, linting, etc.) must pass before your pull request can be merged

## Getting Help

If you need assistance, have questions, or want to discuss ideas, you can join our [Discord] server and chat with the community.

[mise]: https://mise.jdx.dev/getting-started.html
[mise-activate]: https://mise.jdx.dev/getting-started.html#activate-mise
[podman]: https://podman.io/docs/installation
[docker]: https://docs.docker.com/get-docker/
[gh-discussion]: https://github.com/likeon/geometa/discussions
[Discord]: https://discord.gg/AcXEWznYZe
