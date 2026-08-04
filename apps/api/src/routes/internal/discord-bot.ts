import { maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { logChange } from '@api/lib/internal/changes';
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

export const discordBotRouter = new Elysia({ prefix: '/discord-bot' })
  .use(auth(true))
  .post(
    'challenges',
    async ({ body, status }) => {
      let response: Response;
      try {
        response = await geoguessrAPIFetch(GEOGUESSR_CHALLENGES_URL, {
          method: 'POST',
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            forbidMoving: body.forbid_moving,
            forbidRotating: body.forbid_rotating,
            forbidZooming: body.forbid_zooming,
            map: body.geoguessr_map_id,
            rounds: 5,
            timeLimit: body.time_limit,
          }),
        });
      } catch (error) {
        console.error('GeoGuessr challenge creation request failed', error);
        return status(502, CHALLENGE_ERROR);
      }

      if (!response.ok) {
        console.error(
          `GeoGuessr challenge creation failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
        return status(502, CHALLENGE_ERROR);
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        console.error('GeoGuessr challenge creation returned invalid JSON');
        return status(502, CHALLENGE_ERROR);
      }

      if (!challengeResponseValidator.Check(data)) {
        console.error('GeoGuessr challenge creation returned no token');
        return status(502, CHALLENGE_ERROR);
      }

      return {
        url: `https://www.geoguessr.com/challenge/${encodeURIComponent(data.token.trim())}`,
      };
    },
    {
      body: t.Object({
        geoguessr_map_id: t.String({ minLength: 1 }),
        time_limit: t.Integer({ minimum: 0 }),
        forbid_moving: t.Boolean(),
        forbid_rotating: t.Boolean(),
        forbid_zooming: t.Boolean(),
      }),
    },
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
