import { Elysia, t } from 'elysia';
import { db } from '@lib/drizzle';
import { maps } from '@lib/db/schema';
import { eq } from 'drizzle-orm';
import { getRequestIp } from '@lib/utils/log';
import { BunRequest } from 'bun';
import { syncToCache } from '@lib/db/cache';

// not displayed to user
// used privately by backend portion of sveltekit
export const internalRouter = new Elysia({prefix: '/internal'})
  .get('/map-groups/:id/sync', async ({ params: { id }, query, set }) => {
    await syncToCache(id);
  }, {
    params: t.Object({ id: t.Integer()}),
  });
