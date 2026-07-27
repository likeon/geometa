import type {
  ChallengeConfig,
  GameMode,
  MapDefinition,
  Player,
} from "./challenge.js";
import { object, text } from "./challenge.js";

const REQUEST_TIMEOUT_MS = 20_000;
const RESULT_PAGE_LIMIT = 50;
const RESULT_MAX_PAGES = 20;
const CHALLENGES_URL = "https://www.geoguessr.com/api/v3/challenges";

export type Fetcher = typeof fetch;

export function challengePayload(
  map: MapDefinition,
  mode: GameMode,
  config: ChallengeConfig,
): Record<string, unknown> {
  return {
    forbidMoving: mode.settings.forbid_moving,
    forbidRotating: mode.settings.forbid_rotating,
    forbidZooming: mode.settings.forbid_zooming,
    map: map.mapId,
    rounds: config.rounds,
    timeLimit: config.timeLimit,
  };
}

export async function createGeoGuessrChallenge(
  map: MapDefinition,
  mode: GameMode,
  config: ChallengeConfig,
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<string> {
  const data = object(await requestJson(
    CHALLENGES_URL,
    cookie,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(challengePayload(map, mode, config)),
    },
    fetcher,
  ));
  const token = text(data.token);
  if (!token) throw new Error("GeoGuessr challenge response had no token");
  return token;
}

export async function fetchChallengeResults(
  challengeToken: string,
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<Player[]> {
  const base =
    `https://www.geoguessr.com/api/v3/results/highscores/${encodeURIComponent(challengeToken)}` +
    `?friends=false&limit=${RESULT_PAGE_LIMIT}&minRounds=1`;
  const players = new Map<string, Player>();
  const seenTokens = new Set<string>();
  let paginationToken = "";

  for (let page = 0; page < RESULT_MAX_PAGES; page += 1) {
    const url = paginationToken
      ? `${base}&paginationToken=${encodeURIComponent(paginationToken)}`
      : base;
    const data = await requestJson(url, cookie, {}, fetcher);
    const rows = resultRows(data);
    if (!rows.length) break;
    for (const row of rows) {
      const player = parseResultPlayer(row);
      if (!player) continue;
      const key = player.userId || player.playerName.toLowerCase();
      const current = players.get(key);
      if (!current || player.totalScore > current.totalScore) players.set(key, player);
    }

    const next = text(object(data).paginationToken);
    if (!next) break;
    if (seenTokens.has(next)) throw new Error("GeoGuessr repeated a pagination token");
    if (page + 1 >= RESULT_MAX_PAGES) {
      throw new Error(`GeoGuessr results exceeded ${RESULT_MAX_PAGES} pages`);
    }
    seenTokens.add(next);
    paginationToken = next;
  }

  return [...players.values()].sort((left, right) =>
    right.totalScore - left.totalScore ||
    left.playerName.localeCompare(right.playerName)
  );
}

export async function enrichPlayerCountries(
  players: Player[],
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const userIds = [...new Set(players.map((player) => player.userId).filter(Boolean))];
  const countries = new Map(await Promise.all(userIds.map(async (userId) => {
    try {
      const profile = object(await requestJson(
        `https://www.geoguessr.com/api/v3/users/${encodeURIComponent(userId)}`,
        cookie,
        {},
        fetcher,
      ));
      return [userId, text(profile.countryCode).toUpperCase()] as const;
    } catch (error) {
      console.error(`[challengebot] profile failed for ${userId}: ${errorMessage(error)}`);
      return [userId, ""] as const;
    }
  })));
  for (const player of players) player.country = countries.get(player.userId) || undefined;
}

export function resultRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isObject);
  if (!isObject(data)) return [];
  for (const key of ["items", "results", "highscores", "entries"]) {
    const rows = data[key];
    if (Array.isArray(rows)) return rows.filter(isObject);
  }
  return [];
}

export function parseResultPlayer(item: Record<string, unknown>): Player | null {
  const game = object(item.game);
  const gamePlayer = object(game.player);
  const directPlayer = object(item.player);
  const user = object(item.user);
  const source = Object.keys(gamePlayer).length
    ? gamePlayer
    : Object.keys(directPlayer).length
      ? directPlayer
      : ["playerName", "nick", "name"].some((key) => item[key] !== undefined)
        ? item
        : user;
  const playerName = text(source.playerName, source.nick, source.name);
  if (!playerName) return null;
  return {
    playerName,
    userId: playerId(source, game, item),
    totalScore: score(source.totalScore ?? item.totalScore),
  };
}

async function requestJson(
  url: string,
  cookie: string,
  init: RequestInit,
  fetcher: Fetcher,
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "geoguessr-challenge-discordbot/2.0");
  headers.set("Cookie", cookieHeader(cookie));

  const response = await fetcher(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GeoGuessr HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new Error("GeoGuessr returned invalid JSON", { cause: error });
  }
}

function cookieHeader(cookie: string): string {
  let decoded = cookie;
  try {
    decoded = decodeURIComponent(cookie);
  } catch {}
  return `_ncfa=${decoded}`;
}

function playerId(...sources: Record<string, unknown>[]): string {
  for (const source of sources) {
    for (const key of [
      "id",
      "userId",
      "user_id",
      "uid",
      "playerId",
      "player_id",
      "geoguessrId",
      "geoguessr_id",
    ]) {
      const value = text(source[key]);
      if (value) return value;
    }
    for (const key of ["user", "player"]) {
      const nested = object(source[key]);
      if (Object.keys(nested).length) {
        const value = playerId(nested);
        if (value) return value;
      }
    }
  }
  return "";
}

function score(value: unknown): number {
  const raw = isObject(value) ? value.amount : value;
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
