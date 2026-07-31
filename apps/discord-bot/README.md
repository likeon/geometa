# GeoMeta Discord Bot

One Rust binary provides:

- the existing `/publish` command;
- a daily, button-only GeoGuessr challenge post.

The always-on Deployment runs the Discord gateway. A Kubernetes CronJob runs
`discord-bot challenge` at 12:00 Europe/Berlin, posts one challenge-link button
per configured pool, and exits.

## Configuration

The challenge job reads `config.yaml`:

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

## Run

```bash
cargo run
cargo run -- challenge
```

Both modes require `DISCORD_TOKEN`. Production also sets `API_HOST=api` and
mounts a Kubernetes service-account token with audience `api`.

## Check

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
