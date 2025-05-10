import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { Discord } from 'arctic';
import { sessions, users } from '$lib/db/schema';
import { getDb } from '$lib/drizzle';
import memoizeOne from 'memoize-one';

export function initializeLucia() {
  const db = getDb();
  const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: !dev
      }
    },
    getUserAttributes: (attributes) => ({
      id: attributes.id,
      username: attributes.username
    })
  });
}

export const getLucia = memoizeOne(initializeLucia);

declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: string;
  username: string;
}

export function getDiscord() {
  return new Discord(
    env.DISCORD_APPLICATION_ID,
    env.DISCORD_SECRET_ID,
    env.LOGIN_RETURN_URL ?? 'http://localhost:5173/login/callback'
  );
}
