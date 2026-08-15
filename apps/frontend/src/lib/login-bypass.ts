import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';

import { users } from '$lib/db/schema';

const DEFAULT_LOGIN_BYPASS_UID = '1001';

/** Dev-only: lets you log in without Discord OAuth. Enabled via LOGIN_BYPASS_ALLOW. */
export function isLoginBypassEnabled(): boolean {
  return env.LOGIN_BYPASS_ALLOW === 'true';
}

export function getLoginBypassUid(): string {
  return env.LOGIN_BYPASS_UID ?? DEFAULT_LOGIN_BYPASS_UID;
}

/**
 * Creates a session for the bypass user (ensuring the user row exists) and
 * sets the session cookie. Returns the session and user for populating locals.
 */
export async function createLoginBypassSession(
  event: RequestEvent,
  uid: string = getLoginBypassUid()
) {
  const existingUser = await event.locals.db.query.users.findFirst({
    where: eq(users.id, uid)
  });
  if (!existingUser) {
    await event.locals.db.insert(users).values({ id: uid, username: 'login-bypass' });
  }

  const session = await event.locals.lucia.createSession(uid, {});
  const sessionCookie = event.locals.lucia.createSessionCookie(session.id);
  event.cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });

  const user = existingUser ?? { id: uid, username: 'login-bypass' };
  return { session, user };
}
