import { sequence } from '@sveltejs/kit/hooks';
import { handleErrorWithSentry, sentryHandle, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { type Handle, redirect } from '@sveltejs/kit';
import { getLucia } from '$lib/auth';
import { getDb } from '$lib/drizzle';
import { dev } from '$app/environment';
import { building } from '$app/environment';
import log from '$lib/log';

// Only use Sentry in production
const sentryHandlers = dev
  ? []
  : [
      initCloudflareSentryHandle({
        dsn: 'https://e3246bfc0996fb9eb5ced91d84b98301@o4506021108383744.ingest.us.sentry.io/4508975174385664',
        tracesSampleRate: 1.0
      }),
      sentryHandle()
    ];

export const handle: Handle = sequence(...sentryHandlers, async ({ event, resolve }) => {
  event.locals.startTime = Date.now();
  if (building) {
    return resolve(event);
  }

  const db = getDb();
  const lucia = getLucia();
  event.locals.db = db;
  event.locals.lucia = lucia;

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
          path: '/',
          ...sessionCookie.attributes
        });
      }
      redirectToLogin = false;
    }
    if (!session) {
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

  const response = await resolve(event);
  log(response.status, event);
  return response;
});

// todo: wrap to log into stdout as well
export const handleError = dev ? undefined : handleErrorWithSentry();
