import { escapeMarkdown } from "discord.js";

export type Creator = {
  name: string;
  geoguessrId: string;
  discordId: string;
  customLinkText: string;
  customLinkUrl: string;
};

export type GameMode = {
  name: string;
  settings: {
    forbid_moving: boolean;
    forbid_rotating: boolean;
    forbid_zooming: boolean;
  };
};

export type MapDefinition = {
  name: string;
  mapId: string;
  mapKey: string;
  gameModes: string[];
  creator: Creator;
};

export type MapPool = {
  name: string;
  key: string;
  maps: MapDefinition[];
};

export type ChallengeConfig = {
  channelId: string;
  postTime: string;
  timeZone: string;
  rounds: number;
  timeLimit: number;
  challengeUrl: string;
  message: {
    showTitle: boolean;
    title: string;
    showDate: boolean;
    showNextChallenge: boolean;
    showCreators: boolean;
  };
  leaderboard: {
    enabled: boolean;
    maxPlayers: number;
  };
};

export type Settings = {
  challenge: ChallengeConfig;
  gameModes: Record<string, GameMode>;
  pools: MapPool[];
};

export type Challenge = {
  date: string;
  dailyOrder: number;
  poolKey: string;
  mapKey: string;
  mapName: string;
  modeName: string;
  token: string;
  creator: Creator;
};

export type Player = {
  playerName: string;
  userId: string;
  totalScore: number;
  country?: string;
};

export type RankedPlayer = Player & {
  playedCount: number;
};

export function parseSettings(value: unknown): Settings {
  const root = object(value);
  const errors: string[] = [];
  const rawChallenge = object(root.challenge);

  if (!Object.keys(rawChallenge).length) errors.push("missing 'challenge' section");

  const channelId = text(rawChallenge.channel_id);
  if (!isPositiveIntegerText(channelId)) {
    errors.push("challenge.channel_id must be a positive Discord channel ID");
  }

  const postTime = configuredText(rawChallenge, "post_time", "12:00");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(postTime)) {
    errors.push("challenge.post_time must use valid HH:MM format");
  }

  const timeZone = configuredText(rawChallenge, "timezone", "UTC");
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    errors.push(`challenge.timezone ${JSON.stringify(timeZone)} is not a valid IANA timezone`);
  }

  const rounds = configInteger(rawChallenge.rounds, 1, 1, "challenge.rounds", errors);
  const timeLimit = configInteger(
    rawChallenge.time_limit,
    0,
    0,
    "challenge.time_limit",
    errors,
  );
  const challengeUrl = text(
    rawChallenge.challenge_url,
    "https://www.geoguessr.com/challenge/",
  );
  if (!isHttpUrl(challengeUrl)) {
    errors.push("challenge.challenge_url must be an absolute HTTP(S) URL");
  }

  const rawMessage = object(rawChallenge.message);
  const rawLeaderboard = object(rawChallenge.leaderboard);
  const challenge: ChallengeConfig = {
    channelId,
    postTime,
    timeZone,
    rounds,
    timeLimit,
    challengeUrl,
    message: {
      showTitle: configBoolean(rawMessage.show_title, true),
      title: configuredText(rawMessage, "title", "Daily Challenge"),
      showDate: configBoolean(rawMessage.show_date, true),
      showNextChallenge: configBoolean(rawMessage.show_next_challenge, true),
      showCreators: configBoolean(rawMessage.show_creators, true),
    },
    leaderboard: {
      enabled: configBoolean(rawLeaderboard.enabled, false),
      maxPlayers: configInteger(
        rawLeaderboard.max_players,
        10,
        1,
        "challenge.leaderboard.max_players",
        errors,
      ),
    },
  };

  const rawModes = object(root.game_modes);
  const gameModes: Record<string, GameMode> = {};
  if (!Object.keys(rawModes).length) errors.push("game_modes must be a non-empty mapping");
  for (const [key, value] of Object.entries(rawModes)) {
    const rawMode = object(value);
    if (!Object.keys(rawMode).length) {
      errors.push(`game_modes.${key} must be a mapping`);
      continue;
    }
    const rawSettings = object(rawMode.settings);
    if (rawMode.settings !== undefined && rawMode.settings !== null &&
      !isObject(rawMode.settings)) {
      errors.push(`game_modes.${key}.settings must be a mapping`);
    }
    gameModes[key] = {
      name: text(rawMode.name, key.toUpperCase()),
      settings: {
        forbid_moving: configBoolean(rawSettings.forbid_moving, false),
        forbid_rotating: configBoolean(rawSettings.forbid_rotating, false),
        forbid_zooming: configBoolean(rawSettings.forbid_zooming, false),
      },
    };
  }

  const rawPools = Array.isArray(root.pools) ? root.pools : [];
  if (!rawPools.length) errors.push("pools must be a non-empty list");
  if (rawPools.length > 25) errors.push("pools cannot contain more than 25 entries");

  const pools: MapPool[] = [];
  const poolKeys = new Set<string>();
  for (const [poolIndex, value] of rawPools.entries()) {
    const rawPool = object(value);
    const field = `pools[${poolIndex}]`;
    if (!Object.keys(rawPool).length) {
      errors.push(`${field} must be a mapping`);
      continue;
    }
    const name = text(rawPool.name, `Pool ${poolIndex + 1}`);
    const key = text(rawPool.id, rawPool.name, `pool-${poolIndex + 1}`);
    if (poolKeys.has(key)) errors.push(`${field} has duplicate id/name ${JSON.stringify(key)}`);
    poolKeys.add(key);

    const rawMaps = Array.isArray(rawPool.maps) ? rawPool.maps : [];
    if (!rawMaps.length) errors.push(`${field}.maps must be a non-empty list`);
    const maps: MapDefinition[] = [];
    for (const [mapIndex, rawValue] of rawMaps.entries()) {
      const rawMap = object(rawValue);
      const mapField = `${field}.maps[${mapIndex}]`;
      if (!Object.keys(rawMap).length) {
        errors.push(`${mapField} must be a mapping`);
        continue;
      }
      const mapId = text(rawMap.map_id);
      if (!mapId) errors.push(`${mapField}.map_id must be set`);

      const modeNames = Array.isArray(rawMap.game_modes)
        ? rawMap.game_modes.map((mode) => text(mode)).filter(Boolean)
        : [];
      if (!modeNames.length) {
        errors.push(`${mapField}.game_modes must be a non-empty list`);
      }
      for (const modeName of modeNames) {
        if (!gameModes[modeName]) {
          errors.push(`${mapField}.game_modes references unknown mode ${JSON.stringify(modeName)}`);
        }
      }

      const creator = parseCreator(rawMap, mapField, errors);
      maps.push({
        name: text(rawMap.name, "Map"),
        mapId,
        mapKey: text(rawMap.map_id, rawMap.name),
        gameModes: modeNames,
        creator,
      });
    }
    pools.push({ name, key, maps });
  }

  if (errors.length) throw new Error(`config.yaml:\n- ${errors.join("\n- ")}`);
  return { challenge, gameModes, pools };
}

function parseCreator(
  rawMap: Record<string, unknown>,
  mapField: string,
  errors: string[],
): Creator {
  const rawCreator = object(rawMap.creator);
  const customLink = object(rawCreator.custom_link);
  const customLinkUrl = text(
    customLink.url,
    rawCreator.custom_link_url,
    rawCreator.link_url,
    rawMap.creator_custom_link_url,
  );
  if (customLinkUrl && !isHttpUrl(customLinkUrl)) {
    errors.push(`${mapField}.creator.custom_link.url must be an absolute HTTP(S) URL`);
  }
  return {
    name: text(rawCreator.name, rawMap.creator_name),
    geoguessrId: text(
      rawCreator.geoguessr_id,
      rawCreator.geoguessr_uid,
      rawCreator.geoguessr,
      rawMap.creator_geoguessr_id,
      rawMap.creator_geoguessr_uid,
    ),
    discordId: text(
      rawCreator.discord_id,
      rawCreator.discord_uid,
      rawCreator.discord,
      rawMap.creator_discord_id,
      rawMap.creator_discord_uid,
    ),
    customLinkText: text(
      customLink.text,
      rawCreator.custom_link_text,
      rawCreator.link_text,
      rawMap.creator_custom_link_text,
    ),
    customLinkUrl,
  };
}

export function selectMap(
  pool: MapPool,
  recentMapKeys: string[],
  random: () => number = Math.random,
): MapDefinition {
  if (pool.maps.length === 1) return pool.maps[0]!;
  const recent = new Set(recentMapKeys);
  const fresh = pool.maps.filter((map) => !recent.has(map.mapKey));
  const available = fresh.length ? fresh : pool.maps;
  return available[randomIndex(available.length, random)]!;
}

export function selectMode(
  map: MapDefinition,
  modes: Record<string, GameMode>,
  random: () => number = Math.random,
): { key: string; mode: GameMode } {
  const key = map.gameModes[randomIndex(map.gameModes.length, random)]!;
  const mode = modes[key];
  if (!mode) throw new Error(`unknown game mode ${JSON.stringify(key)}`);
  return { key, mode };
}

function randomIndex(length: number, random: () => number): number {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

export function aggregateLeaderboards(
  leaderboards: Player[][],
): RankedPlayer[] {
  const players = new Map<string, RankedPlayer>();
  for (const leaderboard of leaderboards) {
    const best = new Map<string, Player>();
    for (const player of leaderboard) {
      const key = player.userId || player.playerName.toLowerCase();
      if (!key) continue;
      const current = best.get(key);
      if (!current || player.totalScore > current.totalScore) best.set(key, player);
    }
    for (const [key, player] of best) {
      const current = players.get(key) ?? {
        playerName: player.playerName || "Anonymous",
        userId: player.userId,
        totalScore: 0,
        playedCount: 0,
      };
      current.playerName = player.playerName || current.playerName;
      current.userId ||= player.userId;
      current.totalScore += player.totalScore;
      current.playedCount += 1;
      current.country ||= player.country;
      players.set(key, current);
    }
  }
  return [...players.values()].sort((left, right) =>
    right.totalScore - left.totalScore ||
    right.playedCount - left.playedCount ||
    left.playerName.localeCompare(right.playerName)
  );
}

export function leaderboardMessage(
  players: RankedPlayer[],
  number: number,
  date: string,
  maxPlayers: number,
): string | undefined {
  if (!players.length) return undefined;
  const header = `# DAILY LEADERBOARD #${Math.max(0, Math.trunc(number))} · ${formatDate(date)}`;
  const ranked = players.slice(0, maxPlayers);
  while (ranked.length) {
    const lines = ranked.map((player, index) => {
      const country = playerFlagEmoji(player.country ?? "");
      const score = Number.isFinite(player.totalScore)
        ? Math.max(0, Math.trunc(player.totalScore))
        : 0;
      return `${index === 0 ? "## " : ""}${index + 1}. ${leaderboardName(player.playerName)}` +
        `${country ? ` ${country}  ` : " "}(${score})`;
    });
    const content = `${header}\n\n${lines.join("\n")}`;
    if (content.length <= 2_000) return content;
    ranked.pop();
  }
  return header;
}

function leaderboardName(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim() || "Anonymous";
  const characters = [...clean];
  const truncated = characters.length <= 64
    ? clean
    : `${characters.slice(0, 63).join("")}…`;
  return escapeMarkdown(truncated, { maskedLink: true });
}

export function challengeMessage(
  config: ChallengeConfig,
  challenges: Challenge[],
  nextPost: number,
): string | undefined {
  if (!challenges.length) return undefined;
  const lines: string[] = [];
  if (config.message.showTitle && config.message.title) {
    lines.push(`# ${escapeText(config.message.title)}`);
  }
  const subtitle: string[] = [];
  if (config.message.showDate) subtitle.push(`*${formatDate(challenges[0]!.date)}*`);
  if (config.message.showNextChallenge) subtitle.push(`Next challenge <t:${nextPost}:R>`);
  if (subtitle.length) lines.push(subtitle.join(" - "));
  if (config.message.showCreators) lines.push(...creatorLines(challenges));
  return lines.length ? lines.join("\n") : undefined;
}

function creatorLines(challenges: Challenge[]): string[] {
  const creators = challenges.flatMap((challenge) => {
    const parts = [
      challenge.creator.name ? escapeText(challenge.creator.name) : "",
      discordMention(challenge.creator.discordId),
      geoguessrProfileLink(challenge.creator.geoguessrId),
      customCreatorLink(
        challenge.creator.customLinkText,
        challenge.creator.customLinkUrl,
      ),
    ].filter(Boolean);
    return parts.length ? [{ mapName: challenge.mapName, label: parts.join(" - ") }] : [];
  });
  if (!creators.length) return [];
  if (creators.length === 1) return [`Creator: ${creators[0]!.label}`];
  return [
    "Creators:",
    ...creators.map(({ mapName, label }) => `- ${escapeText(mapName)}: ${label}`),
  ];
}

function discordMention(value: string): string {
  const bare = value.match(/^(\d+)$/);
  const mention = value.match(/^<@!?(\d+)>$/);
  return bare || mention ? `<@${(bare ?? mention)![1]}>` : "";
}

function geoguessrProfileLink(value: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    return isHttpUrl(value) ? `[GeoGuessr](${value})` : "";
  }
  return `[GeoGuessr](https://www.geoguessr.com/user/${encodeURIComponent(value)})`;
}

function customCreatorLink(label: string, url: string): string {
  return label && isHttpUrl(url) ? `[${escapeText(label)}](${url})` : "";
}

export function challengeButtonLabel(mapName: string): string {
  return truncate(mapName, 80);
}

function playerFlagEmoji(value: string): string | null {
  const code = text(value).toUpperCase();
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((character) =>
        0x1F1E6 + character.charCodeAt(0) - 65
      ))
    : null;
}

export function localParts(now: Date, timeZone: string): {
  date: string;
  hour: number;
  minute: number;
} {
  const values: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function isPostDue(now: Date, config: ChallengeConfig): boolean {
  const local = localParts(now, config.timeZone);
  const [hour, minute] = config.postTime.split(":").map(Number);
  return local.hour * 60 + local.minute >= hour! * 60 + minute!;
}

export function nextPostTimestamp(now: Date, config: ChallengeConfig): number {
  const local = localParts(now, config.timeZone);
  const [hour, minute] = config.postTime.split(":").map(Number);
  const targetDate = local.hour * 60 + local.minute >= hour! * 60 + minute!
    ? dateShift(local.date, 1)
    : local.date;
  return Math.floor(zonedEpoch(targetDate, hour!, minute!, config.timeZone) / 1_000);
}

export function dateShift(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function zonedEpoch(date: string, hour: number, minute: number, timeZone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year!, month! - 1, day!, hour, minute);
  let epoch = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = localParts(new Date(epoch), timeZone);
    const [localYear, localMonth, localDay] = local.date.split("-").map(Number);
    const represented = Date.UTC(localYear!, localMonth! - 1, localDay!, local.hour, local.minute);
    epoch += target - represented;
  }
  return epoch;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function truncate(value: string, limit: number): string {
  const clean = value.trim();
  if (clean.length <= limit) return clean;
  let prefix = "";
  for (const character of clean) {
    if (prefix.length + character.length > limit - 3) break;
    prefix += character;
  }
  return `${prefix.trimEnd()}...`;
}

function escapeText(value: string): string {
  return escapeMarkdown(value.replace(/\s+/g, " ").trim(), { maskedLink: true })
    .replaceAll("@", "@\u200B");
}

function configInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  field: string,
  errors: string[],
): number {
  if (value === undefined) return fallback;
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < minimum) {
    errors.push(`${field} must be an integer of at least ${minimum}`);
    return fallback;
  }
  return result;
}

function configBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" || typeof value === "bigint") return value !== 0;
  if (typeof value === "string") {
    if (["1", "true", "yes", "on"].includes(value.trim().toLowerCase())) return true;
    if (["0", "false", "no", "off"].includes(value.trim().toLowerCase())) return false;
  }
  return fallback;
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isPositiveIntegerText(value: string): boolean {
  try {
    return /^\d+$/.test(value) && BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function configuredText(
  values: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  return Object.hasOwn(values, key)
    ? String(values[key] ?? "").trim()
    : fallback;
}

export function text(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const result = String(value).trim();
    if (result) return result;
  }
  return "";
}

export function object(value: unknown): Record<string, unknown> {
  return isObject(value)
    ? value as Record<string, unknown>
    : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
