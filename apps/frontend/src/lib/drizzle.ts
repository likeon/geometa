import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '$env/dynamic/private';
import * as schema from '$lib/db/schema';
import memoizeOne from 'memoize-one';

function createDbInstance() {
  let databaseURL: string;
  if (env.DATABASE_URL) {
    databaseURL = env.DATABASE_URL;
  } else {
    databaseURL = `postgresql://geometa:${env.DATABASE_PASSWORD}@postgres/geometa?sslmode=require`;
  }
  return drizzle(databaseURL, { schema, logger: false });
}
export type DB = ReturnType<typeof createDbInstance>;
export const getDb = memoizeOne(createDbInstance);
