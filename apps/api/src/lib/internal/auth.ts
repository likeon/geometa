import bearer from '@elysiajs/bearer';
import { Elysia, t } from 'elysia';

const frontendToken = process.env.FRONTEND_API_TOKEN;
const prod = process.env.NODE_ENV === 'production';

export function auth() {
  return new Elysia({ name: 'geometa-auth' })
    .use(bearer())
    .onBeforeHandle(({ bearer, headers, set }) => {
      if (prod) {
        if (!bearer) {
          set.status = 401;
          return;
        }

        if (bearer !== frontendToken) {
          set.status = 403;
          return;
        }
      }
    })
    .as('global');
}

export function user() {
  return new Elysia({ name: 'geometa-user' })
    .onBeforeHandle(({ headers, set }) => {
      if (!headers['x-api-user-id']) {
        set.status = 400;
        return prod ? undefined : 'set x-api-user-id header';
      }
    })
    .guard({ headers: t.Object({ 'x-api-user-id': t.String() }) })
    .resolve(({ headers }) => {
      return {
        userId: headers['x-api-user-id'],
      };
    })
    .as('global');
}
