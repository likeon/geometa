import { prod } from '@api/lib/utils/env';
import * as Sentry from '@sentry/bun';
import Elysia from 'elysia';

export function sentry() {
  const elysia = new Elysia({ name: 'sentry' });

  if (prod) {
    const dsn = Bun.env.SENTRY_DSN;

    Sentry.init({
      dsn,
    });

    return elysia.onError(
      { as: 'global' },
      function captureException({ error }) {
        Sentry.captureException(error);
      },
    );
  }
  return elysia;
}
