import { users } from '@api/lib/db/schema';
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
  );
