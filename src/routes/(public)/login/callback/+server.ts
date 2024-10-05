import { OAuth2RequestError } from 'arctic';
import { db } from '$lib/drizzle';
import type { RequestEvent } from '@sveltejs/kit';
import { discord, lucia } from '$lib/auth';
import { eq } from 'drizzle-orm';
import { users } from '$lib/db/schema';

interface DiscordUser {
  id: string;
  username: string;
}

export async function GET(event: RequestEvent) {
  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const storedState = event.cookies.get('discord_oauth_state') ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await discord.validateAuthorizationCode(code);
    const discordUserResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`
      }
    });

    if (!discordUserResponse.ok) {
      throw new Error('Failed to fetch Discord user');
    }

    const discordUser: DiscordUser = await discordUserResponse.json();
    const existingUser = await db.query.users.findFirst({ where: eq(users.id, discordUser.id) });

    if (existingUser) {
      await db
        .update(users)
        .set({ username: discordUser.username })
        .where(eq(users.id, discordUser.id));
    } else {
      await db.insert(users).values({ id: discordUser.id, username: discordUser.username });
    }
    const session = await lucia.createSession(discordUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dev/dash'
      }
    });
  } catch (e) {
    if (e instanceof OAuth2RequestError && e.message === 'invalid_grant') {
      // Handle invalid authorization code error
      return new Response(null, { status: 400 });
    }
    // Log the error for debugging purposes
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
