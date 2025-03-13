import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/db/schema';
import { env } from '$env/dynamic/private';

export function getDb(platform_env: App.Platform['env']) {
  const client = postgres(platform_env.db?.connectionString || DATABASE_URL);
  return drizzle(client, { schema, logger: env.DRIZZLE_LOGGING === 'true' || false });
}
export type DB = ReturnType<typeof getDb>;
