[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

# LearnableMeta
This is monorepo for [learnablemeta.com](https://learnablemeta.com/) project.

**⚠️ This repository is for developers and technical contributors only.**

## For Regular Users

If you're looking to use LearnableMeta:
- 📖 Installation guide: https://learnablemeta.com/about
- 💬 Need help? Join our Discord: https://discord.gg/AcXEWznYZe (#help-desk channel)

Even if you believe your issue is technical, please start with Discord support first.

## For Developers
Repo includes source code for the entire project: userscript, frontend and api services, discord bot, k8s cluster build and deployment configuration.

## Contributing
All kinds of contributions are welcome. Make sure to read the [CONTRIBUTING.md](CONTRIBUTING.md) first!

### Tech Stack
We started with a single SvelteKit fullstack service running on Cloudflare Workers, but SvelteKit's fullstack capabilities weren't as comprehensive as we needed, and Cloudflare KV had terrible latency. Eventually we split out frontend and API services - the frontend is supposed to fetch and modify data only through the API, but right now the transition isn't fully finished and the frontend is still hitting the database directly on some old pages.

- Frontend: SvelteKit 5, TypeScript, TailwindCSS 4
- Backend: Elysia.js (Bun runtime), PostgreSQL with Drizzle ORM
- Discord bot: rust using poise/serenity
- Deployment: Kubernetes with Flux GitOps
