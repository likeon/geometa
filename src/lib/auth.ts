import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { DISCORD_APPLICATION_ID, DISCORD_SECRET_ID, LOGIN_RETURN_URL } from '$env/static/private';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { Discord } from 'arctic';
import { sessions, users } from '$lib/db/schema';
import type { DB } from '$lib/drizzle';

export function initializeLucia(db: DB) {
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

export const discord = new Discord(
  DISCORD_APPLICATION_ID,
  DISCORD_SECRET_ID,
  LOGIN_RETURN_URL ?? 'http://localhost:5173/login/callback'
);
