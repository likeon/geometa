import { prod } from '@api/lib/utils/env';
import * as Sentry from '@sentry/bun';
import { Elysia, t } from 'elysia';
import * as jose from 'jose';
import memoizeOne from 'memoize-one';

const getJWKS = memoizeOne(async () => {
  const ca = await Bun.file(
    '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
  ).text();

  return jose.createRemoteJWKSet(
    new URL('https://kubernetes.default.svc/openid/v1/jwks'),
    {
      [jose.customFetch]: async (url: URL | string, options?: RequestInit) => {
        const bearer = await Bun.file(
          '/var/run/secrets/kubernetes.io/serviceaccount/token',
        ).text();
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${bearer}`,
          },
          tls: {
            ca,
          },
        });
      },
    },
  );
});

export function bearer() {
  return new Elysia({ name: 'bearer' }).derive(
    { as: 'global' },
    function deriveBearer({ headers }) {
      const auth = headers.authorization;

      return {
        bearer: auth?.startsWith('Bearer ') ? auth.slice(7) : null,
      };
    },
  );
}
const frontendToken = process.env.FRONTEND_API_TOKEN;

export function auth(jwt?: boolean) {
  return new Elysia({ name: `geometa-auth`, seed: { jwt } })
    .use(bearer())
    .onBeforeHandle(async ({ bearer, status }) => {
      if (prod) {
        if (!bearer) {
          return status(401);
        }

        if (jwt) {
          const jwks = await getJWKS();
          try {
            await jose.jwtVerify(bearer, jwks, {
              // todo: verify issuer as well
              // currently it's node ip - requires k8s config changes to advertise kubernetes.default.svc
              audience: 'api',
            });
          } catch (error) {
            if (error instanceof jose.errors.JWTClaimValidationFailed) {
              Sentry.captureException(error);
              return status(403, ['JWT validation failed']);
            } else {
              throw error;
            }
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
    .model({
      UnauthenticatedResponse: t.Void(),
      InvalidAuthTokenResponse: t.Void(),
    });
}
