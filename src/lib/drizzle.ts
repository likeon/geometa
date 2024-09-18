import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';
import * as schema from '$lib/db/schema';

const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, {schema});
