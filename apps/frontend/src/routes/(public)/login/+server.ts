import { generateState } from 'arctic';
import { redirect } from '@sveltejs/kit';

import { getDiscord } from '$lib/auth';

export async function GET(event) {
  const state = generateState();
  const scopes = ['identify'];
  const url = getDiscord().createAuthorizationURL(state, null, scopes);

  event.cookies.set('discord_oauth_state', state, {
    path: '/',
    secure: import.meta.env.PROD,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax'
  });

  return redirect(302, url.toString());
}
