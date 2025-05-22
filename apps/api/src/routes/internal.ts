import { mapGroups, maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import {
  ensurePermissions,
  permissionErrorCatcher,
} from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
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
  .post(
    '/map-groups/:id/sync',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);
      const group = await db.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!group) {
        return status(404);
      }
      await syncMapGroup(group);
      return;
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .use(permissionErrorCatcher());
