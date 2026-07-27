import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  object,
  text,
  type Challenge,
  type Creator,
} from "./challenge.js";

const RECENT_MAP_HISTORY = 20;

type StateData = Record<string, unknown> & {
  last_posted_date: string | null;
  recent_maps: Record<string, string[]>;
  posted_pools: {
    date?: string;
    pool_keys?: string[];
  };
  daily_challenges: Record<string, unknown[]>;
  posted_leaderboards: string[];
};

export class StateStore {
  // ponytail: local state assumes one bot process; add file locking only for
  // multi-instance deployment.
  // ponytail: history stays unbounded; add retention only if file size matters.
  private constructor(
    readonly path: string,
    private readonly data: StateData,
  ) {}

  static async open(path = "state.json"): Promise<StateStore> {
    const absolutePath = resolve(path);
    let source: string;
    try {
      source = await readFile(absolutePath, "utf8");
    } catch (error) {
      if (isErrorCode(error, "ENOENT")) return new StateStore(absolutePath, emptyState());
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      throw new Error(`Invalid state file ${absolutePath}; fix or move it before starting`, {
        cause: error,
      });
    }
    return new StateStore(absolutePath, normalizeState(parsed, absolutePath));
  }

  hasPosted(date: string): boolean {
    return this.data.last_posted_date === date;
  }

  challengeNumber(date: string): number {
    return Object.entries(this.data.daily_challenges)
      .filter(([challengeDate, challenges]) =>
        challengeDate <= date && challenges.length > 0
      ).length;
  }

  challengesFor(date: string): Challenge[] {
    const values = this.data.daily_challenges[date] ?? [];
    return values.flatMap((value, index) => {
      const raw = object(value);
      const token = text(raw.token);
      const poolKey = text(raw.pool_key);
      if (!token || !poolKey) return [];
      return [{
        date: text(raw.created_date, date),
        dailyOrder: positiveInteger(raw.daily_order, index + 1),
        poolKey,
        mapKey: text(raw.map_key),
        mapName: text(raw.map_name, "Map"),
        modeName: text(raw.game_mode),
        token,
        creator: parseCreator(raw),
      }];
    });
  }

  recentMapKeys(poolKey: string, limit: number): string[] {
    return (this.data.recent_maps[poolKey] ?? []).slice(0, Math.max(0, limit));
  }

  async saveChallenge(challenge: Challenge): Promise<void> {
    const entries = this.data.daily_challenges[challenge.date] ?? [];
    this.data.daily_challenges[challenge.date] = [
      ...entries.filter((value) => text(object(value).pool_key) !== challenge.poolKey),
      serializeChallenge(challenge),
    ];

    if (challenge.mapKey) {
      const history = this.data.recent_maps[challenge.poolKey] ?? [];
      this.data.recent_maps[challenge.poolKey] = [
        challenge.mapKey,
        ...history.filter((key) => key !== challenge.mapKey),
      ].slice(0, RECENT_MAP_HISTORY);
    }
    await this.save();
  }

  async markPosted(date: string, poolKeys: string[]): Promise<void> {
    this.data.last_posted_date = date;
    this.data.posted_pools = { date, pool_keys: poolKeys };
    await this.save();
  }

  hasHandledLeaderboard(date: string): boolean {
    return this.data.posted_leaderboards.includes(date);
  }

  async markLeaderboardHandled(date: string): Promise<void> {
    if (!this.data.posted_leaderboards.includes(date)) {
      this.data.posted_leaderboards.push(date);
      await this.save();
    }
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    let handle;
    try {
      handle = await open(temporaryPath, "w");
      await handle.writeFile(`${JSON.stringify(this.data, null, 2)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporaryPath, this.path);
    } catch (error) {
      await handle?.close().catch(() => {});
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}

function normalizeState(value: unknown, path: string): StateData {
  if (!isObject(value)) throw new Error(`Invalid state file ${path}: top level must be an object`);
  requireType(
    value.last_posted_date === undefined ||
      value.last_posted_date === null ||
      isDate(value.last_posted_date),
    path,
    "last_posted_date must be a YYYY-MM-DD date or null",
  );
  requireType(
    value.recent_maps === undefined || isStringArrayRecord(value.recent_maps),
    path,
    "recent_maps must map pool keys to string arrays",
  );
  requireType(
    value.posted_pools === undefined || isObject(value.posted_pools),
    path,
    "posted_pools must be an object",
  );
  requireType(
    value.daily_challenges === undefined || isArrayRecord(value.daily_challenges),
    path,
    "daily_challenges must map dates to arrays",
  );
  if (isObject(value.daily_challenges)) {
    for (const [date, entries] of Object.entries(value.daily_challenges)) {
      requireType(isDate(date), path, "daily_challenges keys must be YYYY-MM-DD dates");
      requireType(
        Array.isArray(entries) && entries.every(isStoredChallenge),
        path,
        "daily_challenges entries must contain token and pool_key strings",
      );
    }
  }
  requireType(
    value.posted_leaderboards === undefined ||
      (isStringArray(value.posted_leaderboards) &&
        value.posted_leaderboards.every(isDate)),
    path,
    "posted_leaderboards must be a YYYY-MM-DD date array",
  );

  const postedPools = object(value.posted_pools);
  requireType(
    postedPools.date === undefined || isDate(postedPools.date),
    path,
    "posted_pools.date must be a YYYY-MM-DD date",
  );
  requireType(
    postedPools.pool_keys === undefined || isStringArray(postedPools.pool_keys),
    path,
    "posted_pools.pool_keys must be a string array",
  );
  return {
    ...value,
    last_posted_date: typeof value.last_posted_date === "string"
      ? value.last_posted_date
      : null,
    recent_maps: (value.recent_maps ?? {}) as Record<string, string[]>,
    posted_pools: {
      ...(typeof postedPools.date === "string" ? { date: postedPools.date } : {}),
      ...(isStringArray(postedPools.pool_keys)
        ? { pool_keys: postedPools.pool_keys }
        : {}),
    },
    daily_challenges: (value.daily_challenges ?? {}) as Record<string, unknown[]>,
    posted_leaderboards: (value.posted_leaderboards ?? []) as string[],
  };
}

function serializeChallenge(challenge: Challenge): Record<string, unknown> {
  return {
    token: challenge.token,
    map_name: challenge.mapName,
    game_mode: challenge.modeName,
    map_key: challenge.mapKey,
    pool_key: challenge.poolKey,
    daily_order: challenge.dailyOrder,
    created_date: challenge.date,
    creator: {
      name: challenge.creator.name,
      geoguessr_id: challenge.creator.geoguessrId,
      discord_id: challenge.creator.discordId,
      custom_link_text: challenge.creator.customLinkText,
      custom_link_url: challenge.creator.customLinkUrl,
    },
  };
}

function parseCreator(rawChallenge: Record<string, unknown>): Creator {
  const creator = object(rawChallenge.creator);
  return {
    name: text(creator.name, rawChallenge.creator_name),
    geoguessrId: text(creator.geoguessr_id, rawChallenge.creator_geoguessr_id),
    discordId: text(creator.discord_id, rawChallenge.creator_discord_id),
    customLinkText: text(
      creator.custom_link_text,
      rawChallenge.creator_custom_link_text,
    ),
    customLinkUrl: text(
      creator.custom_link_url,
      rawChallenge.creator_custom_link_url,
    ),
  };
}

function emptyState(): StateData {
  return {
    last_posted_date: null,
    recent_maps: {},
    posted_pools: {},
    daily_challenges: {},
    posted_leaderboards: [],
  };
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isArrayRecord(value: unknown): boolean {
  return isObject(value) && Object.values(value).every(Array.isArray);
}

function isStringArrayRecord(value: unknown): boolean {
  return isObject(value) && Object.values(value).every(isStringArray);
}

function isStoredChallenge(value: unknown): boolean {
  return isObject(value) &&
    typeof value.token === "string" &&
    Boolean(value.token) &&
    typeof value.pool_key === "string" &&
    Boolean(value.pool_key);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

function requireType(condition: boolean, path: string, detail: string): void {
  if (!condition) throw new Error(`Invalid state file ${path}: ${detail}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error &&
    (error as NodeJS.ErrnoException).code === code;
}
