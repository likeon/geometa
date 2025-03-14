import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/db/schema';
import { dev } from '$app/environment';

let poolClient: postgres.Sql;
if (dev) {
  poolClient = postgres(DATABASE_URL);
}

export function getDb(platform_env: App.Platform['env']) {
  const client = poolClient || postgres(platform_env.db?.connectionString || DATABASE_URL);
  return drizzle(client, { schema, logger: false });
}
export type DB = ReturnType<typeof getDb>;
