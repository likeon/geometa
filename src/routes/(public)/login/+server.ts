import { generateState } from 'arctic';
import { redirect } from '@sveltejs/kit';

import { discord } from '$lib/auth';

export async function GET(event) {
  const state = generateState();
  const url = await discord.createAuthorizationURL(state, { scopes: ['identify'] });

  event.cookies.set('discord_oauth_state', state, {
    path: '/',
    secure: import.meta.env.PROD,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax'
  });

  return redirect(302, url.toString());
}
