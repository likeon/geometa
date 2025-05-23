import { prod } from '@api/lib/utils/env';
import bearer from '@elysiajs/bearer';
import { Elysia, t } from 'elysia';

const frontendToken = process.env.FRONTEND_API_TOKEN;

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
    .macro({
      userId: {
        async resolve({ status, request: { headers } }) {
          const userId = headers.get('x-api-user-id');
          if (!userId) {
            return status(401);
          }

          return { userId };
        },
      },
    })
    .as('global');
}
