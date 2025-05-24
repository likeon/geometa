import { maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { Elysia } from 'elysia';

export const mapsRouter = new Elysia({ prefix: '/maps' })
  .use(auth())
  .get('/', async () => {
    return db.select().from(maps);
  });
