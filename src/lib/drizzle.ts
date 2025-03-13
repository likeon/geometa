import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/db/schema';

export function getDb(env: App.Platform['env']) {
  const client = postgres(env.db?.connectionString || DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}
export type DB = ReturnType<typeof getDb>;
