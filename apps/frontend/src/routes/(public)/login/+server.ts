import { generateState } from 'arctic';
import { redirect } from '@sveltejs/kit';

import { getDiscord } from '$lib/auth';
import { createLoginBypassSession, isLoginBypassEnabled } from '$lib/login-bypass';

export async function GET(event) {
  if (isLoginBypassEnabled()) {
    // Dev-only: skip Discord OAuth, authenticate as the LOGIN_BYPASS_UID user.
    await createLoginBypassSession(event);
    const redirectUrl = event.cookies.get('afterLoginRedirectUrl');
    throw redirect(302, redirectUrl || '/map-making');
  }

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
