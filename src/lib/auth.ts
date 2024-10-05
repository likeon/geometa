import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { DISCORD_APPLICATION_ID, DISCORD_SECRET_ID } from '$env/static/private';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '$lib/drizzle';
import { sessions, users } from '$lib/db/schema';
import { Discord } from 'arctic';
import { env } from '$env/dynamic/private';

const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev
    }
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      username: attributes.username
    };
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
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
  env.LOGIN_RETURN_URL ?? 'http://localhost:5173/login/callback'
);
