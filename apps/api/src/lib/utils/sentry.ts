import { config } from '@api/config';
import { prod } from '@api/lib/utils/env';
import * as Sentry from '@sentry/bun';
import Elysia from 'elysia';

export function sentry() {
  const elysia = new Elysia({ name: 'sentry' });

  if (prod) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
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
