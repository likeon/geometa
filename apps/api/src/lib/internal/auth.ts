import { prod } from '@api/lib/utils/env';
import bearer from '@elysiajs/bearer';
import { Elysia } from 'elysia';
import * as jose from 'jose';
import memoizeOne from 'memoize-one';

const getJWKS = memoizeOne(() =>
  jose.createRemoteJWKSet(new URL('https://kubernetes.default.svc/openid/v1/jwks'))
);
const frontendToken = process.env.FRONTEND_API_TOKEN;

export function auth(jwt?: boolean) {
  return new Elysia({ name: 'geometa-auth' })
    .use(bearer())
    .onBeforeHandle(async ({ bearer, status }) => {
      if (prod) {
        if (!bearer) {
          return status(401);
        }

        if (jwt) {
          // JWT validation via jose
          try {
            const jwks = getJWKS();
            const { payload } = await jose.jwtVerify(bearer, jwks);
            // JWT is valid, continue processing
          } catch (error) {
            return status(403);
          }
        } else {
          // Regular token validation
          if (bearer !== frontendToken) {
            return status(403);
          }
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
