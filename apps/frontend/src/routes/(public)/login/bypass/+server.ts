import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET(event: RequestEvent) {
  const userId = event.url.searchParams.get('uid');
  if (!userId || env.ALLOW_LOGIN_BYPASS !== 'true') {
    return new Response(null, { status: 400 });
  }
  const session = await event.locals.lucia.createSession(userId, {});
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
}
