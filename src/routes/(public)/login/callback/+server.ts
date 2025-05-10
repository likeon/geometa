import { OAuth2RequestError } from 'arctic';
import type { RequestEvent } from '@sveltejs/kit';
import { getDiscord } from '$lib/auth';
import { eq } from 'drizzle-orm';
import { mapGroupPermissions, mapGroups, users } from '$lib/db/schema';

interface DiscordUser {
  id: string;
  username: string;
}

export async function GET(event: RequestEvent) {
  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const storedState = event.cookies.get('discord_oauth_state') ?? null;
  const db = event.locals.db;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await getDiscord().validateAuthorizationCode(code);
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
      const mapGroup = await db
        .insert(mapGroups)
        .values({ name: 'Default map group' })
        .returning({ id: mapGroups.id });
      await db
        .insert(mapGroupPermissions)
        .values({ mapGroupId: mapGroup[0].id, userId: discordUser.id });
    }
    const session = await event.locals.lucia.createSession(discordUser.id, {});
    const sessionCookie = event.locals.lucia.createSessionCookie(session.id);
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
    if (e instanceof Error) {
      console.error('Stack Trace:', e.stack);
    }
    return new Response(null, { status: 500 });
  }
}
