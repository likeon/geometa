import { Elysia, t } from 'elysia';
import { syncMapGroup } from '@lib/internal/sync';

// not displayed to user
// used privately by backend portion of sveltekit
export const internalRouter = new Elysia({ prefix: '/internal' }).get(
  '/map-groups/:id/sync',
  async ({ params: { id }, query, set }) => {
    await syncMapGroup(id);
  },
  {
    params: t.Object({ id: t.Integer() }),
  },
);
