import { mapGroupPermissions, mapGroups, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { assertNotNullish, generateRandomString } from '@api/lib/utils/common';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';

export const usersRouter = new Elysia({ prefix: '/users' })
  .use(auth())
  .get(
    '/profile',
    async ({ userId }) => {
      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });
      assertNotNullish(user);

      return {
        hasApiToken: user.apiToken !== null,
      };
    },
    { userId: true },
  )
  .post(
    '/profile/regenerate-api-token',
    async ({ userId }) => {
      const newToken = generateRandomString(48);
      // pray there is no collision because i am lazy
      await db
        .update(users)
        .set({ apiToken: newToken })
        .where(eq(users.id, userId));
      return { apiToken: newToken };
    },
    {
      userId: true,
    },
  )
  .post(
    '/first-login-setup',
    async ({ userId }) => {
      // idempotent: safe to call on every login. If the user already has any
      // group permission, do nothing so a failed first call self-heals on retry.
      const existing = await db.$primary.query.mapGroupPermissions.findFirst({
        where: eq(mapGroupPermissions.userId, userId),
      });
      if (existing) {
        return { mapGroupId: existing.mapGroupId };
      }

      const mapGroupId = await db.$primary.transaction(async (tx) => {
        const mapGroup = await tx
          .insert(mapGroups)
          .values({ name: 'Default map group' })
          .returning({ id: mapGroups.id });
        await tx
          .insert(mapGroupPermissions)
          .values({ mapGroupId: mapGroup[0].id, userId });
        return mapGroup[0].id;
      });
      return { mapGroupId };
    },
    {
      userId: true,
    },
  );
