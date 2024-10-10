import type { RequestEvent } from '@sveltejs/kit';
import { lucia } from '$lib/auth';
import { ALLOW_LOGIN_BYPASS } from '$env/static/private';

export async function GET(event: RequestEvent) {
  const userId = event.url.searchParams.get('uid');
  if (!userId || ALLOW_LOGIN_BYPASS !== 'true') {
    return new Response(null, { status: 400 });
  }
  const session = await lucia.createSession(userId, {});
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
}
