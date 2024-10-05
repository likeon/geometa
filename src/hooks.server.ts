import { type Handle, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const isAdminUrl = event.url.pathname.startsWith('/dev/dash');
  let redirectToLogin = isAdminUrl;

  const sessionId = event.cookies.get(lucia.sessionCookieName);
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
  } else {
    const { session, user } = await lucia.validateSession(sessionId);
    if (session) {
      if (session.fresh) {
        // session cookie is valid, but needs a refresh
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '.',
          ...sessionCookie.attributes
        });
      }
      redirectToLogin = false;
    }
    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    }
    event.locals.user = user;
    event.locals.session = session;
  }

  if (redirectToLogin) {
    throw redirect(307, '/login/');
  }

  return resolve(event);
};
