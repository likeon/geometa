import { maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { logChange } from '@api/lib/internal/changes';
import {
  type ChallengeSettings,
  claimDailyChallengeGeneration,
  completeDailyChallengeGeneration,
  type DailyChallengeBatch,
  DailyChallengeSettingsConflictError,
  getOrCreateDailyChallengeBatch,
  InsufficientChallengeMapsError,
  loadDailyChallengeBatch,
  releaseDailyChallengeGeneration,
  saveDailyChallengeUrl,
} from '@api/lib/internal/discord-challenges';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { geoguessrAPIFetch } from '@api/lib/internal/utils';
import { eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { TypeCompiler } from 'elysia/type-system';

const GEOGUESSR_CHALLENGES_URL = 'https://www.geoguessr.com/api/v3/challenges';
const DISCORD_VERIFIED_MESSAGES_THRESHOLD = 5;
const CHALLENGE_ERROR = { message: 'Failed to create GeoGuessr challenge' };
const challengeResponseValidator = TypeCompiler.Compile(
  t.Object(
    { token: t.String({ pattern: '\\S' }) },
    { additionalProperties: true },
  ),
);
const challengeSettingsSchema = t.Object({
  time_limit: t.Integer({ minimum: 0 }),
  forbid_moving: t.Boolean(),
  forbid_rotating: t.Boolean(),
  forbid_zooming: t.Boolean(),
});

function dailyChallengeResponse(batch: DailyChallengeBatch) {
  return {
    batchId: batch.batchId,
    date: batch.date,
    challenges: batch.maps.map((map) => {
      if (map.url === null) {
        throw new Error('Completed daily challenge batch has missing URLs');
      }
      return {
        geoguessrId: map.geoguessrId,
        name: map.name,
        authors: map.authors,
        difficulty: map.difficulty,
        url: map.url,
      };
    }),
  };
}

async function createGeoguessrChallenge(
  geoguessrMapId: string,
  settings: ChallengeSettings,
): Promise<string> {
  let response: Response;
  try {
    response = await geoguessrAPIFetch(GEOGUESSR_CHALLENGES_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        forbidMoving: settings.forbid_moving,
        forbidRotating: settings.forbid_rotating,
        forbidZooming: settings.forbid_zooming,
        map: geoguessrMapId,
        rounds: 5,
        timeLimit: settings.time_limit,
      }),
    });
  } catch (error) {
    console.error('GeoGuessr challenge creation request failed', error);
    throw new Error(CHALLENGE_ERROR.message);
  }

  if (!response.ok) {
    console.error(
      `GeoGuessr challenge creation failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
    throw new Error(CHALLENGE_ERROR.message);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    console.error('GeoGuessr challenge creation returned invalid JSON');
    throw new Error(CHALLENGE_ERROR.message);
  }

  if (!challengeResponseValidator.Check(data)) {
    console.error('GeoGuessr challenge creation returned no token');
    throw new Error(CHALLENGE_ERROR.message);
  }

  return `https://www.geoguessr.com/challenge/${encodeURIComponent(data.token.trim())}`;
}

export const discordBotRouter = new Elysia({ prefix: '/discord-bot' })
  .use(auth(true))
  .post(
    'challenges',
    async ({ body, status }) => {
      try {
        return {
          url: await createGeoguessrChallenge(body.geoguessr_map_id, body),
        };
      } catch {
        return status(502, CHALLENGE_ERROR);
      }
    },
    {
      body: t.Intersect([
        challengeSettingsSchema,
        t.Object({ geoguessr_map_id: t.String({ minLength: 1 }) }),
      ]),
    },
  )
  .post(
    'daily-challenges',
    async ({ body, status }) => {
      let batch: DailyChallengeBatch;
      try {
        batch = await getOrCreateDailyChallengeBatch(body);
      } catch (error) {
        if (
          error instanceof InsufficientChallengeMapsError ||
          error instanceof DailyChallengeSettingsConflictError
        ) {
          return status(409, { message: error.message });
        }
        throw error;
      }

      if (batch.status === 'complete') {
        return dailyChallengeResponse(batch);
      }

      const claim = await claimDailyChallengeGeneration(batch.batchId);
      if (claim.state === 'complete') {
        return dailyChallengeResponse(
          await loadDailyChallengeBatch(batch.batchId),
        );
      }
      if (claim.state === 'busy') {
        return status(409, {
          message: 'Daily challenge generation is already in progress',
        });
      }

      const missingChallenges = batch.maps.filter((map) => map.url === null);
      const results = await Promise.allSettled(
        missingChallenges.map(async (map) => {
          const url = await createGeoguessrChallenge(map.geoguessrId, body);
          return saveDailyChallengeUrl(
            batch.batchId,
            map.id,
            claim.leaseToken,
            url,
          );
        }),
      );
      if (results.some((result) => result.status === 'rejected')) {
        await releaseDailyChallengeGeneration(batch.batchId, claim.leaseToken);
        return status(502, CHALLENGE_ERROR);
      }

      await completeDailyChallengeGeneration(batch.batchId, claim.leaseToken);
      batch = await loadDailyChallengeBatch(batch.batchId);
      return dailyChallengeResponse(batch);
    },
    { body: challengeSettingsSchema },
  )
  .post(
    'maps/:geoguessrId/publish',
    async ({ params: { geoguessrId }, body, status }) => {
      const map = await db.$primary.query.maps.findFirst({
        where: eq(maps.geoguessrId, geoguessrId),
        with: { mapRegions: true },
      });
      if (!map) {
        return status(404);
      }

      if (map.isPersonal) {
        return status(400, {
          errors: ["Personal maps can't be published"],
        });
      }
      if (map.isPublished) {
        return status(400, {
          errors: ['Already published'],
        });
      }

      if (!map.mapGroupId) {
        return status(400, {
          errors: ['Map does not belong to a group'],
        });
      }

      // any group member qualifies: the real gate is the Discord server
      // restricting who can run /publish, this only verifies map ownership
      await ensurePermissions(body.discord_thread_author_id, map.mapGroupId);

      const errors: string[] = [];
      if (!map.authors?.trim()) {
        errors.push('Author(s) not specified');
      }
      if (!map.description?.trim()) {
        errors.push('Description is missing');
      }
      if (!map.mapRegions.length) {
        errors.push('Regions are not selected');
      }

      if (errors.length) {
        return status(400, {
          errors: errors,
        });
      }

      await db.$primary.transaction(async (tx) => {
        await tx
          .update(maps)
          .set({ isPublished: true })
          .where(eq(maps.geoguessrId, geoguessrId));
        await logChange(tx, {
          mapGroupId: map.mapGroupId!,
          userId: body.discord_thread_author_id,
          entityType: 'map',
          entityId: map.id,
          entityLabel: map.name,
          operation: 'update',
          oldValue: { isPublished: false },
          newValue: { isPublished: true },
        });
      });
      return status(200);
    },
    {
      body: t.Object({ discord_thread_author_id: t.String() }),
    },
  )
  .get(
    'users/:id/is-discord-verified',
    async ({ params: { id } }) => {
      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, id),
      });

      return { isDiscordVerified: user?.isDiscordVerified ?? false };
    },
    {
      params: t.Object({ id: t.String({ minLength: 1 }) }),
    },
  )
  .post(
    'users/:id/verified-message',
    async ({ params: { id } }) => {
      const [row] = await db.$primary
        .insert(users)
        .values({
          id,
          username: id,
          isDiscordVerified: false,
          discordVerifiedMessages: 1,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            discordVerifiedMessages: sql`COALESCE(${users.discordVerifiedMessages}, 0) + 1`,
            isDiscordVerified: sql`CASE
              WHEN COALESCE(${users.discordVerifiedMessages}, 0) + 1 >= ${DISCORD_VERIFIED_MESSAGES_THRESHOLD}
              THEN true
              ELSE ${users.isDiscordVerified}
            END`,
          },
        })
        .returning({
          isDiscordVerified: users.isDiscordVerified,
          discordVerifiedMessages: users.discordVerifiedMessages,
        });

      return {
        isDiscordVerified: row?.isDiscordVerified ?? false,
        discordVerifiedMessages: row?.discordVerifiedMessages ?? 1,
      };
    },
    {
      params: t.Object({ id: t.String({ minLength: 1 }) }),
    },
  );
