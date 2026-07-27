import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type SendableChannels,
} from "discord.js";
import { parse } from "yaml";

import {
  aggregateLeaderboards,
  challengeButtonLabel,
  challengeMessage,
  dateShift,
  isPostDue,
  leaderboardMessage,
  localParts,
  nextPostTimestamp,
  object,
  parseSettings,
  selectMap,
  selectMode,
  text,
  type Challenge,
  type Settings,
} from "./challenge.js";
import {
  createGeoGuessrChallenge,
  enrichPlayerCountries,
  fetchChallengeResults,
  type Fetcher,
} from "./geoguessr.js";
import { StateStore } from "./state.js";

const TICK_MS = 30_000;
const RETRY_MS = 5 * 60_000;
const LEARNABLE_META_MAPS_URL = "https://learnablemeta.com/api/maps/";
const LEARNABLE_META_TIMEOUT_MS = 20_000;

export async function loadSettings(
  path = "config.yaml",
  fetcher: Fetcher = fetch,
): Promise<Settings> {
  const source = await readFile(path, "utf8");
  const value: unknown = parse(source, { intAsBigInt: true });
  await hydrateLearnableMetaPools(value, fetcher);
  return parseSettings(value);
}

async function hydrateLearnableMetaPools(
  value: unknown,
  fetcher: Fetcher,
): Promise<void> {
  const pools = object(value).pools;
  if (!Array.isArray(pools)) return;

  await Promise.all(pools.map(async (value, index) => {
    const pool = object(value);
    if (pool.learnable_meta === undefined) return;
    const field = `pools[${index}]`;
    if (pool.maps !== undefined) {
      throw new Error(`config.yaml: ${field} cannot set both maps and learnable_meta`);
    }
    if (
      pool.learnable_meta === null ||
      typeof pool.learnable_meta !== "object" ||
      Array.isArray(pool.learnable_meta)
    ) {
      throw new Error(`config.yaml: ${field}.learnable_meta must be a mapping`);
    }
    if (!Array.isArray(pool.game_modes) || !pool.game_modes.length) {
      throw new Error(
        `config.yaml: ${field}.game_modes must be a non-empty list for learnable_meta pools`,
      );
    }

    const config = pool.learnable_meta as Record<string, unknown>;
    const url = new URL(LEARNABLE_META_MAPS_URL);
    const region = text(config.region);
    if (region) url.searchParams.set("region", region);
    if (config.is_shared !== undefined) {
      if (typeof config.is_shared !== "boolean") {
        throw new Error(`config.yaml: ${field}.learnable_meta.is_shared must be a boolean`);
      }
      url.searchParams.set("isShared", String(config.is_shared));
    }

    let response: Response;
    try {
      response = await fetcher(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "geoguessr-challenge-discordbot/2.0",
        },
        signal: AbortSignal.timeout(LEARNABLE_META_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(
        `${field}.learnable_meta request failed: ${errorMessage(error)}`,
      );
    }
    if (!response.ok) {
      throw new Error(`${field}.learnable_meta returned HTTP ${response.status}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(`${field}.learnable_meta returned invalid JSON`, { cause: error });
    }
    if (!Array.isArray(data) || !data.length) {
      throw new Error(`${field}.learnable_meta returned no maps`);
    }

    pool.maps = data.map((value, mapIndex) => {
      const map = object(value);
      const mapId = text(map.geoguessrId);
      const name = text(map.name);
      if (!mapId || !name) {
        throw new Error(
          `${field}.learnable_meta map ${mapIndex + 1} is missing name or geoguessrId`,
        );
      }
      return {
        name,
        map_id: mapId,
        game_modes: pool.game_modes,
        creator: { name: text(map.authors) },
      };
    });
  }));
}

export async function createMissingChallenges(
  settings: Settings,
  state: StateStore,
  date: string,
  cookie: string,
  fetcher: Fetcher = fetch,
  random: () => number = Math.random,
): Promise<{ challenges: Challenge[]; errors: string[] }> {
  const byPool = new Map(
    state.challengesFor(date).map((challenge) => [challenge.poolKey, challenge]),
  );
  const errors: string[] = [];

  for (const [index, pool] of settings.pools.entries()) {
    if (byPool.has(pool.key)) continue;
    try {
      const map = selectMap(
        pool,
        state.recentMapKeys(pool.key, pool.maps.length - 1),
        random,
      );
      const { mode } = selectMode(map, settings.gameModes, random);
      const token = await createGeoGuessrChallenge(
        map,
        mode,
        settings.challenge,
        cookie,
        fetcher,
      );
      const challenge: Challenge = {
        date,
        dailyOrder: index + 1,
        poolKey: pool.key,
        mapKey: map.mapKey,
        mapName: map.name,
        modeName: mode.name,
        token,
        creator: map.creator,
      };
      await state.saveChallenge(challenge);
      byPool.set(pool.key, challenge);
    } catch (error) {
      errors.push(`${pool.name}: ${errorMessage(error)}`);
    }
  }

  return {
    challenges: settings.pools.flatMap((pool) => {
      const challenge = byPool.get(pool.key);
      return challenge ? [challenge] : [];
    }),
    errors,
  };
}

async function main(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const cookie = process.env.GEOGUESSR_NCFA_COOKIE?.trim();
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured");
  if (!cookie) throw new Error("GEOGUESSR_NCFA_COOKIE is not configured");

  const settings = await loadSettings();
  const state = await StateStore.open(process.env.STATE_PATH?.trim() || "state.json");
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  let ticking = false;
  let stopping = false;
  let retryAt = 0;
  let timer: NodeJS.Timeout | undefined;

  const tick = async (): Promise<void> => {
    if (ticking || stopping || Date.now() < retryAt) return;
    ticking = true;
    try {
      const now = new Date();
      if (!isPostDue(now, settings.challenge)) return;
      const today = localParts(now, settings.challenge.timeZone).date;
      const yesterday = dateShift(today, -1);
      const needsLeaderboard = settings.challenge.leaderboard.enabled &&
        !state.hasHandledLeaderboard(yesterday);
      const needsChallenges = !state.hasPosted(today);
      if (!needsLeaderboard && !needsChallenges) return;

      const channel = await challengeChannel(client, settings.challenge.channelId);
      const failures: string[] = [];

      if (needsLeaderboard) {
        try {
          const challenges = state.challengesFor(yesterday);
          if (challenges.length) {
            const results = await Promise.all(
              challenges.map((challenge) =>
                fetchChallengeResults(challenge.token, cookie)
              ),
            );
            await enrichPlayerCountries(results.flat(), cookie);
            const content = leaderboardMessage(
              aggregateLeaderboards(results),
              state.challengeNumber(yesterday),
              yesterday,
              settings.challenge.leaderboard.maxPlayers,
            );
            if (content) {
              await channel.send({ content, allowedMentions: { parse: [] } });
              console.log(`[challengebot] posted leaderboard for ${yesterday}`);
            } else {
              console.log(`[challengebot] no leaderboard results for ${yesterday}`);
            }
          }
          await state.markLeaderboardHandled(yesterday);
        } catch (error) {
          failures.push(`leaderboard: ${errorMessage(error)}`);
        }
      }

      if (needsChallenges) {
        const created = await createMissingChallenges(
          settings,
          state,
          today,
          cookie,
        );
        failures.push(...created.errors);
        if (created.challenges.length === settings.pools.length) {
          try {
            await postChallenges(channel, settings, created.challenges);
            // ponytail: JSON and Discord cannot commit atomically; reconcile message history
            // only if duplicate announcements become an observed failure mode.
            await state.markPosted(today, settings.pools.map((pool) => pool.key));
            console.log(`[challengebot] posted ${created.challenges.length} challenges`);
          } catch (error) {
            failures.push(`announcement: ${errorMessage(error)}`);
          }
        }
      }

      if (failures.length) {
        retryAt = Date.now() + RETRY_MS;
        console.error(`[challengebot] ${failures.join("; ")}`);
      } else {
        retryAt = 0;
      }
    } catch (error) {
      retryAt = Date.now() + RETRY_MS;
      console.error(`[challengebot] scheduler failed: ${errorMessage(error)}`);
    } finally {
      ticking = false;
    }
  };

  client.once(Events.ClientReady, (ready) => {
    console.log(`[challengebot] logged in as ${ready.user.tag}`);
    timer = setInterval(() => void tick(), TICK_MS);
    void tick();
  });
  client.on(Events.Error, (error) => {
    console.error(`[challengebot] Discord client error: ${error.message}`);
  });

  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    if (timer) clearInterval(timer);
    console.log(`[challengebot] stopping on ${signal}`);
    client.destroy();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await client.login(token);
}

async function postChallenges(
  channel: SendableChannels,
  settings: Settings,
  challenges: Challenge[],
): Promise<void> {
  if (challenges.length > 25) throw new Error("Discord supports at most 25 challenge buttons");
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < challenges.length; index += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const challenge of challenges.slice(index, index + 5)) {
      const base = settings.challenge.challengeUrl.endsWith("/")
        ? settings.challenge.challengeUrl
        : `${settings.challenge.challengeUrl}/`;
      const button = new ButtonBuilder()
        .setLabel(challengeButtonLabel(challenge.mapName))
        .setStyle(ButtonStyle.Link)
        .setURL(`${base}${encodeURIComponent(challenge.token)}`);
      row.addComponents(button);
    }
    rows.push(row);
  }

  const content = challengeMessage(
    settings.challenge,
    challenges,
    nextPostTimestamp(new Date(), settings.challenge),
  );
  await channel.send({
    ...(content ? { content } : {}),
    components: rows,
    flags: MessageFlags.SuppressEmbeds,
    allowedMentions: { parse: [] },
  });
}

async function challengeChannel(
  client: Client,
  channelId: string,
): Promise<SendableChannels> {
  const channel = client.channels.cache.get(channelId) ??
    await client.channels.fetch(channelId);
  if (!channel?.isSendable()) {
    throw new Error(`Discord channel ${channelId} is unavailable`);
  }
  return channel;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[challengebot] startup failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
