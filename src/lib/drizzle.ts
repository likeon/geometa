import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_SSL, DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/db/schema';

const client = postgres(process.env.db || DATABASE_URL, {
  prepare: false
});

export const db = drizzle(client, { schema });

export function getDb(env) {
  const client = postgres(env.db?.connectionString || DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}
