# LearnableMeta

LearnableMeta is the monorepo behind [learnablemeta.com](https://learnablemeta.com). It stores GeoGuessr map and location metadata in PostgreSQL and serves it through a SvelteKit frontend, a Bun/Elysia API, a browser userscript, and a Rust Discord bot. The repository also contains the database schema, local development orchestration, container builds, and Flux deployment manifests.

## For regular users

If you want to use LearnableMeta:

- [Installation guide](https://learnablemeta.com/about)
- [Discord support](https://discord.gg/AcXEWznYZe) in `#help-desk`

Even if the issue appears technical, please start with Discord support.

## Architecture

```text
GeoGuessr + userscript ─┐
SvelteKit server ───────┼── HTTP ──> Elysia API ──> PostgreSQL
Discord bot ────────────┘

SvelteKit server ─────────────────────────> PostgreSQL
                     remaining auth, cache, and cron paths
```

| Component | Runtime and stack | Responsibility |
| --- | --- | --- |
| `apps/frontend` | Node 24, SvelteKit, Svelte 5, TypeScript, Tailwind CSS 4 | Public map pages, authentication, and administrative map-management UI |
| `apps/api` | Bun 1.3, Elysia, Drizzle ORM | HTTP contracts, database schema and migrations, map synchronization, and backend jobs |
| `userscript` | Svelte 5, Vite, vite-plugin-monkey | GeoGuessr integration, metadata overlays, location uploads, and map-group synchronization |
| `apps/discord-bot` | Rust edition 2024, Tokio, Poise/Serenity | Discord gateway, `/publish`, daily challenges, and optional spam moderation |
| `apps/common/flux` | Kubernetes, Kustomize, Flux | Shared PostgreSQL, image proxy, tunnel, registry, RBAC, and network-policy resources |

The frontend imports the API's `App` type and creates an Eden client, so API route changes are visible to frontend type checking. Some SvelteKit server code also queries PostgreSQL directly for sessions, map caching, and cron handlers; those paths bypass the API.

The API mounts these interfaces under `/api`:

| Prefix | Purpose |
| --- | --- |
| `/api/maps` | Lists published, non-personal maps with search, region, GeoGuessr ID, and shared-map filters |
| `/api/userscript` | Serves map/location metadata and bearer-authenticated synchronization data to the userscript |
| `/api/internal` | Frontend and Discord-bot operations for maps, groups, metas, locations, and users |
| `/api/docs` | Generated Swagger UI; production omits internal routes |
| `/api/health-check` | Returns `ok` for service health probes |

Swagger is the canonical HTTP reference; this README does not duplicate request and response schemas.

## Repository layout

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts             # Server and CLI entry point
│   │   │   ├── api.ts               # Elysia application wiring
│   │   │   ├── routes/
│   │   │   │   ├── userscript.ts    # Userscript-facing routes
│   │   │   │   ├── maps.ts          # Public map listing
│   │   │   │   └── internal/        # Frontend and bot routes
│   │   │   ├── lib/
│   │   │   │   ├── db/              # Drizzle schema and migrations
│   │   │   │   ├── internal/        # Shared internal-domain logic
│   │   │   │   ├── userscript/      # Userscript queries and transforms
│   │   │   │   └── utils/           # External clients and shared utilities
│   │   │   └── scripts/             # Runnable maintenance jobs
│   │   ├── tests/support/            # PostgreSQL test harness
│   │   ├── utils/db/                 # Database bootstrap and backup SQL
│   │   ├── TESTING.md                # API testing contract
│   │   ├── Dockerfile
│   │   └── flux/                     # API deployment and CronJob resources
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── (public)/        # Public pages and login
│   │   │   │   ├── (admin)/         # Map-making and personal-map UI
│   │   │   │   └── api/cronjobs/    # Frontend-owned scheduled handlers
│   │   │   └── lib/                  # Components, auth, API, and DB clients
│   │   ├── static/
│   │   ├── Dockerfile
│   │   └── flux/                     # Frontend deployment and CronJobs
│   ├── discord-bot/
│   │   ├── src/
│   │   │   ├── discord/              # Gateway, commands, and moderation
│   │   │   ├── alm/                  # LearnableMeta API client
│   │   │   └── challenge.rs          # Scheduled challenge mode
│   │   ├── config.example.yaml
│   │   ├── Dockerfile
│   │   └── flux/                     # Gateway, challenge job, and model cache
│   ├── common/flux/                  # Shared cluster services
│   └── kustomization.yaml            # Production resource composition
├── userscript/
│   ├── src/                          # GeoGuessr userscript source
│   ├── tests/                        # Bun tests
│   ├── dist/geometa.user.js          # Published userscript bundle
│   ├── CHANGELOG.md                  # Injected into production builds
│   └── vite.config.ts                # Userscript metadata and build wiring
├── dist/                             # Legacy bundle compatibility path
├── scripts/
│   └── process-compose/              # Local orchestration and optional ONNX setup
├── .github/workflows/                # API, frontend, and bot image builds
├── process-compose.yaml              # Local process definitions
├── process-compose.env               # Preferred local ports
├── justfile                          # Root development commands
├── mise.toml                         # Node, Bun, and development tools
├── CONTRIBUTING.md
└── LICENSE
```

## Local development

The root workflow uses Bash and is tested on Linux and Windows through WSL.

### Prerequisites

| Requirement | Used for |
| --- | --- |
| `mise`, activated in the shell | Node, Bun, `just`, `prek`, Process Compose, and `get-port` |
| Podman or Docker | Local PostgreSQL and the optional ONNX service |
| PostgreSQL client tools | `psql` for bootstrap; `createdb` and `dropdb` for API database tests |
| `pnpm` | Userscript dependencies and scripts |
| Rust toolchain | Discord bot only |

### Bootstrap

Run from the repository root:

```bash
mise install
just install
just run
```

`just install` upgrades the mise-managed tools, installs the `pre-commit` and `pre-push` hooks through `prek`, then installs dependencies with `npm ci`, `bun install --locked`, and `pnpm install --frozen-lockfile`.

`just run` selects Podman or Docker, allocates available ports, persists the selected values in the ignored `mise.local.toml`, and opens the Process Compose TUI. PostgreSQL runs in a container; the API and frontend run as host processes. The `info` process prints the active frontend URL, Swagger URL, PostgreSQL port, and optional ONNX URL.

> [!IMPORTANT]
> A new PostgreSQL data directory has no application schema or bootstrap data. Keep `just run` active and initialize it once from a second shell:
>
> ```bash
> just api::db-init
> ```

PostgreSQL data persists under `.dev/data/postgres`. Stopping Process Compose removes its temporary containers without deleting that directory.

### Local processes

The ports below are starting points. `scripts/process-compose/run.sh` replaces occupied ports with available ones and records the result in `mise.local.toml`.

| Process | Execution | Preferred port | Default state |
| --- | --- | ---: | --- |
| `postgres` | PostgreSQL 17 container | `5432` | Started |
| `api` | Bun host process | `3000` | Started after PostgreSQL is healthy |
| `frontend` | Vite host process | `5173` | Started after PostgreSQL and the API |
| `discord-bot-spam-detect-onnx` | ONNX Runtime Server container | `37080` | Disabled |
| `discord-bot` | Cargo host process | — | Disabled |

When both engines are installed, local orchestration prefers Podman. Force Docker with:

```bash
CONTAINER_ENGINE=docker just run
```

The optional spam-detection model is not needed for frontend or API development. `scripts/process-compose/setup-discord-spam-model.sh` downloads and checksum-verifies its model and tokenizer under `.dev/data/onnx-runtime`; detailed setup is in the [Discord bot documentation](apps/discord-bot/README.md#local-onnx-server).

## Component workflows

Run component commands from the directory shown.

### Frontend

```bash
cd apps/frontend
npm run dev
npm run check
npm run lint
npm run build
```

The production build uses SvelteKit's Node adapter and writes `build/`. `npm run check` performs Svelte and TypeScript checks; `npm run lint` runs Prettier in check mode followed by ESLint.

### API

```bash
cd apps/api
bun run dev
bun run test
bun run check
bun run type-check
bun run build
```

The test scripts are split by database use:

- `bun run test:unit` runs DB-free `*.unit.test.ts` files concurrently.
- `bun run test:db` runs `*.db.test.ts` files serially against a temporary PostgreSQL database.
- `bun run test` runs both categories serially in one process.

Database tests create a random `geometa_test_*` database from `template0`, load the bootstrap dump, apply newer migrations, reset public tables between tests, verify the database identity, and drop only the guarded temporary database. See [apps/api/TESTING.md](apps/api/TESTING.md) for single-file commands and harness rules.

Database development commands are defined in `apps/api/package.json`:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

The schema and generated migrations live under `apps/api/src/lib/db/`. In production, the API applies pending migrations before it starts listening; migration failure stops startup.

### Userscript

```bash
cd userscript
pnpm run dev
pnpm run check
bun test
pnpm run build
```

The production build:

1. bundles `src/main.ts` with Vite and vite-plugin-monkey;
2. injects `userscript/CHANGELOG.md` into the generated file;
3. writes `userscript/dist/geometa.user.js`; and
4. copies the same bundle to the legacy `dist/geometa.user.js` path.

Production metadata matches `*.geoguessr.com`, runs at `document-start`, and points updates at `userscript/dist/geometa.user.js`.

### Discord bot

```bash
cd apps/discord-bot
cargo run
cargo run -- challenge
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

Running without arguments starts the Discord gateway. The `challenge` argument generates and posts the scheduled daily challenge, then exits. Both modes require `DISCORD_TOKEN`. `config.yaml` supplies challenge settings, while selected credentials and service values can override matching YAML values through the environment. The gateway is disabled in the root Process Compose configuration to avoid connecting development credentials automatically.

Spam moderation, required Discord permissions, configuration precedence, logging, and production model setup are documented in [apps/discord-bot/README.md](apps/discord-bot/README.md).

## Deployment

[apps/kustomization.yaml](apps/kustomization.yaml) composes four Flux trees:

- `apps/common/flux` for shared PostgreSQL, backups, image proxy, tunnel, registry access, RBAC, and network policies;
- `apps/frontend/flux` for the frontend Deployment, ingress, scheduled handlers, and image updates;
- `apps/api/flux` for the API Deployment, ingress, maintenance CronJob, and image updates; and
- `apps/discord-bot/flux` for the gateway Deployment, daily challenge CronJob, model cache, and image updates.

Pushes to `main` that change files under `apps/api`, `apps/frontend`, or `apps/discord-bot` outside their `flux/` directories trigger separate GitHub Actions workflows. Each workflow builds on an ARM64 runner, pushes a timestamped image to GitHub Container Registry, and notifies the matching Flux receiver. Changes limited to a service's `flux/` directory do not rebuild its image.

The userscript is outside those container workflows; its package build produces the tracked distribution files described above.

## Further documentation

- [Contribution workflow](CONTRIBUTING.md)
- [API testing](apps/api/TESTING.md)
- [Discord bot](apps/discord-bot/README.md)
- [Userscript](userscript/README.md)

The repository is licensed under the [GNU Affero General Public License v3](LICENSE).
