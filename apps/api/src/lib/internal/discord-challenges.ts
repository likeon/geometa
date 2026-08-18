import { randomUUID } from 'node:crypto';
import { discordChallengeMapHistory, maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, gte, inArray, max, ne, sql } from 'drizzle-orm';

const CHALLENGE_SELECTION_LOCK_ID = 1_534_189_078;
const RECENCY_FILTER_ENV = 'DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED';
const MAPS_PER_DIFFICULTY = 2;
const MAX_WEIGHT_AGE_DAYS = 90;
const SECONDS_PER_DAY = 86_400;

export const CHALLENGE_DIFFICULTIES = [1, 2, 3] as const;

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
  geoguessrId: string;
  name: string;
  authors: string | null;
  difficulty: number;
}

export function formatChallengeDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

export function isRecencyFilterEnabled(
  value = process.env[RECENCY_FILTER_ENV],
): boolean {
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

export async function selectDailyChallengeMaps(): Promise<{
  batchId: string;
  maps: DailyChallengeMap[];
}> {
  return db.$primary.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${CHALLENGE_SELECTION_LOCK_ID})`,
    );

    const selectedAt = Math.floor(Date.now() / 1000);
    const recencyCondition = isRecencyFilterEnabled()
      ? gte(
          maps.modifiedAt,
          sql<number>`EXTRACT(EPOCH FROM NOW() - INTERVAL '2 months')::integer`,
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
    await tx.insert(discordChallengeMapHistory).values(
      selectedMaps.map((map) => ({
        batchId,
        mapId: map.id,
        selectedAt,
      })),
    );

    return {
      batchId,
      maps: selectedMaps.map(
        ({ id, geoguessrId, name, authors, difficulty }) => ({
          id,
          geoguessrId,
          name,
          authors,
          difficulty,
        }),
      ),
    };
  });
}
