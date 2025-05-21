import { mapGroups, maps } from '@lib/db/schema';
import { db } from '@lib/drizzle';
import { auth } from '@lib/internal/auth';
import {
  ensurePermissions,
  permissionErrorCatcher,
} from '@lib/internal/permissions';
import { syncMapGroup } from '@lib/internal/sync';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

// not displayed to user
// used privately by backend portion of sveltekit
export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(auth())
  .get('/maps', async () => {
    return db.select().from(maps);
  })
  .guard({ headers: t.Object({ 'x-api-user-id': t.String() }) }, (app) =>
    app
      .resolve(({ headers }) => {
        return {
          userId: headers['x-api-user-id'],
        };
      })
      .post(
        '/map-groups/:id/sync',
        async ({ params: { id: groupId }, userId, set }) => {
          await ensurePermissions(userId, groupId);
          const group = await db.query.mapGroups.findFirst({
            where: eq(mapGroups.id, groupId),
          });
          if (!group) {
            set.status = 404;
            return;
          }
          await syncMapGroup(group);
          return;
        },
        {
          params: t.Object({ id: t.Integer() }),
        },
      ),
  )
  .use(permissionErrorCatcher());
