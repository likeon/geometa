# Daily GeoGuessr Challenge Bot

Standalone Discord bot for posting daily GeoGuessr challenges.

- Posts one challenge per configured map pool
- Chooses a random allowed game mode per map
- Avoids recently used maps within each pool
- Uses Discord link buttons
- Can post a numbered daily leaderboard with player flags and total scores
- Needs no commands or database; static pools have no external service dependency

## Requirements

- Node.js 24
- Discord bot token
- GeoGuessr account with permission to create challenges
- GeoGuessr `_ncfa` cookie from that account

> [!IMPORTANT]
> The GeoGuessr account must be able to create challenges. Free accounts usually
> cannot.

## Setup

Install and build:

```bash
npm ci
npm run build
```

Create local files from the examples:

```bash
cp .env.example .env
cp config.example.yaml config.yaml
```

Fill `.env`:

```dotenv
DISCORD_BOT_TOKEN=
GEOGUESSR_NCFA_COOKIE=
```

Keep `.env` private. The Discord token and `_ncfa` cookie grant access to your
bot and GeoGuessr account.

To find `_ncfa`, sign in at `geoguessr.com`, open browser developer tools, then
open Application > Cookies > `https://www.geoguessr.com`.

## Configuration

Edit `config.yaml`.

Important fields:

- `challenge.channel_id`: Discord channel that receives posts
- `challenge.post_time`: daily local time in `HH:MM` format
- `challenge.timezone`: IANA timezone such as `Europe/Berlin`
- `challenge.rounds`: rounds per challenge
- `challenge.time_limit`: seconds per round; `0` means unlimited
- `challenge.message`: title, date, countdown, and creator display options
- `challenge.leaderboard`: optional numbered daily leaderboard and player limit
- `game_modes`: reusable movement restriction presets
- `pools`: static or LearnableMeta-backed map groups; one map is chosen from every pool each day

Each static map needs a `name`, `map_id`, and non-empty `game_modes` list. See
[config.example.yaml](config.example.yaml) for the complete format.

### LearnableMeta pools

A pool can load published maps from LearnableMeta instead of listing them:

```yaml
- name: "Learnable Meta Europe"
  id: "alm-europe"
  learnable_meta:
    region: "Europe"
    is_shared: true
  game_modes: ["nm", "nmpz"]
```

`region` and `is_shared` are optional filters. The pool's `game_modes` apply to
every returned map. Map names and author credits come from LearnableMeta. Its
public map API needs no key. Maps are loaded once at startup; startup fails if
the request fails or the filters return no maps. This selects compatible maps
only; players still need the
[LearnableMeta userscript](https://learnablemeta.com/about) to see learning
notes after their guesses.

Enable Discord Developer Mode and use **Copy Channel ID** to obtain
`challenge.channel_id`. The bot needs permission to view the channel, send
messages, and embed links. It uses only Discord's guilds intent.

## Run

```bash
npm start
```

The scheduler checks every 30 seconds. Starting after the configured time
triggers the same day's catch-up. A failed run retries after five minutes.

Each successfully created pool is saved immediately, so a later failure or
restart retries only missing pools. The combined Discord announcement is sent
after all pools are ready.

## Local state

`state.json` is created in the project root and stores:

- the last announced date
- recently selected maps
- challenge tokens and display metadata
- handled leaderboard dates

Writes use a temporary file and atomic replacement. Existing state files from
the Python version are accepted. Invalid or malformed state stops startup
instead of risking duplicate challenges; repair the file before restarting.

## Development

```bash
npm test
npm run check
```

Both commands compile the strict TypeScript source and run the Node test suite.

```text
src/
  bot.ts             Discord client and scheduler
  challenge.ts       Config, selection, scheduling, and messages
  geoguessr.ts       GeoGuessr HTTP integration
  state.ts           Atomic local JSON state
  tests/
    challenge.test.ts  Focused behavior and recovery checks
```

## License

MIT
