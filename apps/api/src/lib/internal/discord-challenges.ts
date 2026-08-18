import { randomUUID } from 'node:crypto';
import {
  discordChallengeBatches,
  discordChallengeMapHistory,
  mapGroups,
  maps,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import {
  and,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  max,
  ne,
  or,
  sql,
} from 'drizzle-orm';

const CHALLENGE_SELECTION_LOCK_ID = 1_534_189_078;
const RECENCY_FILTER_ENV = 'DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED';
const MAPS_PER_DIFFICULTY = 2;
const MAX_WEIGHT_AGE_DAYS = 90;
const SECONDS_PER_DAY = 86_400;
const GENERATION_LEASE_SECONDS = 120;
const CHALLENGE_TIME_ZONE = 'Europe/Berlin';

export const CHALLENGE_DIFFICULTIES = [1, 2, 3] as const;

type ChallengeBatchStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface ChallengeSettings {
  time_limit: number;
  forbid_moving: boolean;
  forbid_rotating: boolean;
  forbid_zooming: boolean;
}

export interface ChallengeMapCandidate {
  id: number;
  geoguessrId: string;
  name: string;
  authors: string | null;
  difficulty: number;
  lastSelectedAt: number | null;
}

export interface DailyChallengeMap {
  id: number;
  mapId: number | null;
  geoguessrId: string;
  name: string;
  authors: string | null;
  difficulty: number;
  url: string | null;
}

export interface DailyChallengeBatch {
  batchId: string;
  dailyKey: string;
  date: string;
  status: ChallengeBatchStatus;
  maps: DailyChallengeMap[];
}

export type GenerationClaim =
  | { state: 'claimed'; leaseToken: string }
  | { state: 'complete' }
  | { state: 'busy' };

export function formatChallengeDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: CHALLENGE_TIME_ZONE,
  }).format(date);
}

export function challengeDailyKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: CHALLENGE_TIME_ZONE,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function isRecencyFilterEnabled(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${RECENCY_FILTER_ENV} must be true or false`);
}

export class InsufficientChallengeMapsError extends Error {
  constructor(difficulty: number, available: number) {
    super(
      `Difficulty ${difficulty} needs ${MAPS_PER_DIFFICULTY} eligible maps, found ${available}`,
    );
    this.name = 'InsufficientChallengeMapsError';
  }
}

export class DailyChallengeSettingsConflictError extends Error {
  constructor() {
    super('Daily challenge settings differ from the existing batch');
    this.name = 'DailyChallengeSettingsConflictError';
  }
}

export function recencyWeight(
  lastSelectedAt: number | null,
  selectedAt: number,
): number {
  if (lastSelectedAt === null) {
    return (MAX_WEIGHT_AGE_DAYS + 1) ** 2;
  }

  const ageDays = Math.max(0, selectedAt - lastSelectedAt) / SECONDS_PER_DAY;
  return (Math.min(ageDays, MAX_WEIGHT_AGE_DAYS) + 1) ** 2;
}

export function selectWeightedMaps(
  candidates: ChallengeMapCandidate[],
  count: number,
  selectedAt: number,
  random: () => number = Math.random,
): ChallengeMapCandidate[] {
  const remaining = [...candidates];
  const selected: ChallengeMapCandidate[] = [];

  while (selected.length < count && remaining.length > 0) {
    const weights = remaining.map((candidate) =>
      recencyWeight(candidate.lastSelectedAt, selectedAt),
    );
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const target =
      Math.min(Math.max(random(), 0), 1 - Number.EPSILON) * totalWeight;
    let cumulativeWeight = 0;
    let selectedIndex = remaining.length - 1;

    for (const [index, weight] of weights.entries()) {
      cumulativeWeight += weight;
      if (target < cumulativeWeight) {
        selectedIndex = index;
        break;
      }
    }

    selected.push(remaining[selectedIndex]!);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
}

function settingsMatch(
  batch: typeof discordChallengeBatches.$inferSelect,
  settings: ChallengeSettings,
): boolean {
  return (
    batch.timeLimit === settings.time_limit &&
    batch.forbidMoving === settings.forbid_moving &&
    batch.forbidRotating === settings.forbid_rotating &&
    batch.forbidZooming === settings.forbid_zooming
  );
}

function mapHistoryRows(
  rows: (typeof discordChallengeMapHistory.$inferSelect)[],
): DailyChallengeMap[] {
  return rows.map((row) => ({
    id: row.id,
    mapId: row.mapId,
    geoguessrId: row.geoguessrId,
    name: row.mapName,
    authors: row.authors,
    difficulty: row.difficulty,
    url: row.challengeUrl,
  }));
}

function batchDate(dailyKey: string): string {
  return formatChallengeDate(new Date(`${dailyKey}T12:00:00Z`));
}

export async function getOrCreateDailyChallengeBatch(
  settings: ChallengeSettings,
  date = new Date(),
): Promise<DailyChallengeBatch> {
  const dailyKey = challengeDailyKey(date);
  return db.$primary.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${CHALLENGE_SELECTION_LOCK_ID})`,
    );

    const [existingBatch] = await tx
      .select()
      .from(discordChallengeBatches)
      .where(eq(discordChallengeBatches.dailyKey, dailyKey))
      .limit(1);
    if (existingBatch) {
      if (!settingsMatch(existingBatch, settings)) {
        throw new DailyChallengeSettingsConflictError();
      }
      const history = await tx
        .select()
        .from(discordChallengeMapHistory)
        .where(eq(discordChallengeMapHistory.batchId, existingBatch.id))
        .orderBy(
          discordChallengeMapHistory.difficulty,
          discordChallengeMapHistory.id,
        );
      return {
        batchId: existingBatch.id,
        dailyKey,
        date: batchDate(dailyKey),
        status: existingBatch.status,
        maps: mapHistoryRows(history),
      };
    }

    const selectedAt = Math.floor(date.getTime() / 1000);
    const recencyCondition = isRecencyFilterEnabled(
      process.env[RECENCY_FILTER_ENV],
    )
      ? gte(
          mapGroups.syncedAt,
          sql<number>`EXTRACT(EPOCH FROM NOW() - INTERVAL '4 months')::integer`,
        )
      : undefined;
    const candidates = await tx
      .select({
        id: maps.id,
        geoguessrId: maps.geoguessrId,
        name: maps.name,
        authors: maps.authors,
        difficulty: maps.difficulty,
        lastSelectedAt: max(discordChallengeMapHistory.selectedAt),
      })
      .from(maps)
      .innerJoin(mapGroups, eq(mapGroups.id, maps.mapGroupId))
      .leftJoin(
        discordChallengeMapHistory,
        eq(discordChallengeMapHistory.mapId, maps.id),
      )
      .where(
        and(
          eq(maps.isPublished, true),
          eq(maps.isPersonal, false),
          ne(maps.geoguessrId, ''),
          ne(maps.name, ''),
          inArray(maps.difficulty, CHALLENGE_DIFFICULTIES),
          recencyCondition,
        ),
      )
      .groupBy(
        maps.id,
        maps.geoguessrId,
        maps.name,
        maps.authors,
        maps.difficulty,
      );

    const selectedMaps = CHALLENGE_DIFFICULTIES.flatMap((difficulty) => {
      const difficultyCandidates = candidates.filter(
        (candidate) => candidate.difficulty === difficulty,
      );
      if (difficultyCandidates.length < MAPS_PER_DIFFICULTY) {
        throw new InsufficientChallengeMapsError(
          difficulty,
          difficultyCandidates.length,
        );
      }
      return selectWeightedMaps(
        difficultyCandidates,
        MAPS_PER_DIFFICULTY,
        selectedAt,
      );
    });

    const batchId = randomUUID();
    await tx.insert(discordChallengeBatches).values({
      id: batchId,
      dailyKey,
      timeLimit: settings.time_limit,
      forbidMoving: settings.forbid_moving,
      forbidRotating: settings.forbid_rotating,
      forbidZooming: settings.forbid_zooming,
      status: 'pending',
      createdAt: selectedAt,
    });
    const history = await tx
      .insert(discordChallengeMapHistory)
      .values(
        selectedMaps.map((map) => ({
          batchId,
          mapId: map.id,
          geoguessrId: map.geoguessrId,
          mapName: map.name,
          authors: map.authors,
          difficulty: map.difficulty,
          selectedAt,
        })),
      )
      .returning();

    return {
      batchId,
      dailyKey,
      date: batchDate(dailyKey),
      status: 'pending',
      maps: mapHistoryRows(history),
    };
  });
}

export async function claimDailyChallengeGeneration(
  batchId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<GenerationClaim> {
  const leaseToken = randomUUID();
  const [claimed] = await db.$primary
    .update(discordChallengeBatches)
    .set({
      status: 'generating',
      leaseToken,
      leaseUntil: now + GENERATION_LEASE_SECONDS,
    })
    .where(
      and(
        eq(discordChallengeBatches.id, batchId),
        or(
          eq(discordChallengeBatches.status, 'pending'),
          and(
            eq(discordChallengeBatches.status, 'generating'),
            or(
              isNull(discordChallengeBatches.leaseUntil),
              lte(discordChallengeBatches.leaseUntil, now),
            ),
          ),
        ),
      ),
    )
    .returning({ id: discordChallengeBatches.id });
  if (claimed) {
    return { state: 'claimed', leaseToken };
  }

  const [batch] = await db.$primary
    .select({ status: discordChallengeBatches.status })
    .from(discordChallengeBatches)
    .where(eq(discordChallengeBatches.id, batchId))
    .limit(1);
  return { state: batch?.status === 'complete' ? 'complete' : 'busy' };
}

export async function saveDailyChallengeUrl(
  batchId: string,
  historyId: number,
  leaseToken: string,
  url: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  const activeLease = db.$primary
    .select({ id: discordChallengeBatches.id })
    .from(discordChallengeBatches)
    .where(
      and(
        eq(discordChallengeBatches.id, batchId),
        eq(discordChallengeBatches.status, 'generating'),
        eq(discordChallengeBatches.leaseToken, leaseToken),
        gt(discordChallengeBatches.leaseUntil, now),
      ),
    );
  const [saved] = await db.$primary
    .update(discordChallengeMapHistory)
    .set({ challengeUrl: url })
    .where(
      and(
        eq(discordChallengeMapHistory.id, historyId),
        eq(discordChallengeMapHistory.batchId, batchId),
        isNull(discordChallengeMapHistory.challengeUrl),
        exists(activeLease),
      ),
    )
    .returning({ id: discordChallengeMapHistory.id });
  if (!saved) {
    throw new Error('Daily challenge generation lease was lost');
  }
}

export async function releaseDailyChallengeGeneration(
  batchId: string,
  leaseToken: string,
): Promise<void> {
  await db.$primary
    .update(discordChallengeBatches)
    .set({ status: 'pending', leaseToken: null, leaseUntil: null })
    .where(
      and(
        eq(discordChallengeBatches.id, batchId),
        eq(discordChallengeBatches.status, 'generating'),
        eq(discordChallengeBatches.leaseToken, leaseToken),
      ),
    );
}

export async function completeDailyChallengeGeneration(
  batchId: string,
  leaseToken: string,
  completedAt = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db.$primary.transaction(async (tx) => {
    const [{ missingUrls }] = await tx
      .select({
        missingUrls: sql<number>`count(*) FILTER (WHERE ${discordChallengeMapHistory.challengeUrl} IS NULL)::integer`,
      })
      .from(discordChallengeMapHistory)
      .where(eq(discordChallengeMapHistory.batchId, batchId));
    if (missingUrls !== 0) {
      throw new Error(
        'Cannot complete a daily challenge batch with missing URLs',
      );
    }
    const [completed] = await tx
      .update(discordChallengeBatches)
      .set({
        status: 'complete',
        leaseToken: null,
        leaseUntil: null,
        completedAt,
      })
      .where(
        and(
          eq(discordChallengeBatches.id, batchId),
          eq(discordChallengeBatches.status, 'generating'),
          eq(discordChallengeBatches.leaseToken, leaseToken),
        ),
      )
      .returning({ id: discordChallengeBatches.id });
    if (!completed) {
      throw new Error('Daily challenge generation lease was lost');
    }
  });
}

export async function loadDailyChallengeBatch(
  batchId: string,
): Promise<DailyChallengeBatch> {
  const [batch] = await db.$primary
    .select()
    .from(discordChallengeBatches)
    .where(eq(discordChallengeBatches.id, batchId))
    .limit(1);
  if (!batch) {
    throw new Error('Daily challenge batch not found');
  }
  const history = await db.$primary
    .select()
    .from(discordChallengeMapHistory)
    .where(eq(discordChallengeMapHistory.batchId, batchId))
    .orderBy(
      discordChallengeMapHistory.difficulty,
      discordChallengeMapHistory.id,
    );
  return {
    batchId,
    dailyKey: batch.dailyKey,
    date: batchDate(batch.dailyKey),
    status: batch.status,
    maps: mapHistoryRows(history),
  };
}
