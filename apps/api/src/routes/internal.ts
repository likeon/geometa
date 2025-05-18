import { mapGroups } from '@lib/db/schema';
import { db } from '@lib/drizzle';
import { syncMapGroup } from '@lib/internal/sync';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

// not displayed to user
// used privately by backend portion of sveltekit
export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
}).get(
  '/map-groups/:id/sync',
  async ({ params: { id }, query, set }) => {
    // todo: permissions
    const group = await db.query.mapGroups.findFirst({
      where: eq(mapGroups.id, id),
    });
    if (!group) {
      set.status = 404;
      return;
    }
    await syncMapGroup(group);
    return ['ok'];
  },
  {
    params: t.Object({ id: t.Integer() }),
  },
);
