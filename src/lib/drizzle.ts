import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_SSL, DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/db/schema';

const client = postgres(process.env.db || DATABASE_URL, { ssl: DATABASE_SSL === 'true' });

export const db = drizzle(client, { schema });
