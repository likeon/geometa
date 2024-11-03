import { type Handle, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const isPrerendering = !!event.platform;
  if (isPrerendering) {
    return resolve(event);
  }

  const isAdminUrl = event.url.pathname.startsWith('/dev/dash');
  let redirectToLogin = isAdminUrl;

  const sessionId = event.cookies.get(lucia.sessionCookieName);
  if (!sessionId) {
    console.log('No session');
    event.locals.user = null;
    event.locals.session = null;
  } else {
    const { session, user } = await lucia.validateSession(sessionId);
    if (session) {
      console.log('Session is valid');
      if (session.fresh) {
        console.log('Session needs refresh');
        // session cookie is valid, but needs a refresh
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '/',
          ...sessionCookie.attributes
        });
      }
      redirectToLogin = false;
    }
    if (!session) {
      console.log('Session is invalid');
      const sessionCookie = lucia.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes
      });
    }
    event.locals.user = user;
    event.locals.session = session;
  }

  if (redirectToLogin) {
    throw redirect(302, '/login');
  }

  return resolve(event);
};
