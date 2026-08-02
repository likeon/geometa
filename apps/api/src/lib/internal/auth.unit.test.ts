import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test';
import { Elysia } from 'elysia';

const originalAuthRequired = process.env.API_INTERNAL_AUTH_REQUIRED;
const originalFrontendToken = process.env.FRONTEND_API_TOKEN;
const originalBunFile = globalThis.Bun.file;
const originalFetch = globalThis.fetch;
const capturedErrors: unknown[] = [];

// JWT verification reports claim-validation failures through Sentry. Mock that
// external boundary before ./auth loads so the real onBeforeHandle path runs
// with a recorded capture.
mock.module('@sentry/bun', async () => ({
  captureException: (error: unknown) => {
    capturedErrors.push(error);
  },
}));

const { auth, bearer } = await import('./auth');
const jose = await import('jose');

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function bearerApp() {
  return new Elysia().use(bearer()).get('/', ({ bearer }) => ({ bearer }));
}

async function bearerFor(headers: Record<string, string>) {
  const response = await bearerApp().handle(
    new Request('http://localhost/', { headers }),
  );
  expect(response.status).toBe(200);
  return response.json() as Promise<{ bearer: string | null }>;
}

describe('bearer parsing', () => {
  test('returns null when Authorization header is missing', async () => {
    expect(await bearerFor({})).toEqual({ bearer: null });
  });

  test('extracts token from a valid Bearer header', async () => {
    expect(await bearerFor({ Authorization: 'Bearer abc123' })).toEqual({
      bearer: 'abc123',
    });
  });

  test('rejects a malformed Authorization header', async () => {
    expect(await bearerFor({ Authorization: 'Bearer' })).toEqual({
      bearer: null,
    });
  });
});

function userIdApp() {
  return new Elysia().use(auth()).get('/', ({ userId }) => ({ userId }), {
    userId: true,
  });
}

async function requestUserId(headers: Record<string, string>) {
  return userIdApp().handle(new Request('http://localhost/', { headers }));
}

describe('userId macro', () => {
  test('rejects requests without x-api-user-id header', async () => {
    const response = await requestUserId({});
    expect(response.status).toBe(401);
  });

  test('returns the exact identity from x-api-user-id header', async () => {
    const response = await requestUserId({
      'x-api-user-id': 'discord-user-123',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: 'discord-user-123' });
  });
});

// The auth gate is default-enabled: auth() rejects unless
// API_INTERNAL_AUTH_REQUIRED is exactly 'false'. The run command disables it
// globally so the suites above exercise bearer parsing and the userId macro
// without auth. These tests re-enable the default gate per test and exercise
// the real `.use(auth())` composition.
function prodTokenApp() {
  return new Elysia()
    .use(auth())
    .get('/', ({ userId }) => ({ userId }), { userId: true });
}

async function requestProdToken(headers: Record<string, string>) {
  return prodTokenApp().handle(new Request('http://localhost/', { headers }));
}

describe('frontend token contract', () => {
  beforeEach(() => {
    process.env.FRONTEND_API_TOKEN = 'correct-token';
    delete process.env.API_INTERNAL_AUTH_REQUIRED;
  });

  afterEach(() => {
    restoreEnv('API_INTERNAL_AUTH_REQUIRED', originalAuthRequired);
    restoreEnv('FRONTEND_API_TOKEN', originalFrontendToken);
  });

  test('rejects missing bearer with 401', async () => {
    const response = await requestProdToken({
      'x-api-user-id': 'discord-user-123',
    });
    expect(response.status).toBe(401);
  });

  test('rejects wrong frontend token with 403', async () => {
    const response = await requestProdToken({
      'x-api-user-id': 'discord-user-123',
      Authorization: 'Bearer wrong-token',
    });
    expect(response.status).toBe(403);
  });

  test('succeeds with correct frontend token', async () => {
    const response = await requestProdToken({
      'x-api-user-id': 'discord-user-123',
      Authorization: 'Bearer correct-token',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: 'discord-user-123' });
  });
});

// Production JWT contract: auth(true) verifies Kubernetes JWTs against the
// remote JWKS. These tests run the real `.use(auth(true))` flow with only
// external boundaries mocked: service-account files (Bun.file), the JWKS
// endpoint (fetch), and Sentry capture. The auth gate is re-enabled per test
// (API_INTERNAL_AUTH_REQUIRED unset).
//
// The JWKS endpoint fetch count is shared across every test in this suite:
// the memoized construction reuses one remote JWKS set, so the whole process
// must fetch exactly once no matter how many auth(true) requests run (even
// concurrently). A per-request construction would fetch once per request.
let jwksFetches = 0;
let privateKey: CryptoKey;
let publicKey: CryptoKey;
let jwks: () => unknown;

beforeAll(async () => {
  const pair = await jose.generateKeyPair('RS256');
  publicKey = pair.publicKey;
  privateKey = pair.privateKey;
  const jwk = await jose.exportJWK(publicKey);
  jwks = () => ({ keys: [{ ...jwk, kid: 'test-key' }] });
});

function jwtApp() {
  return new Elysia()
    .use(auth(true))
    .get('/', ({ userId }) => ({ userId }), { userId: true });
}

describe('production JWT contract', () => {
  beforeEach(() => {
    delete process.env.API_INTERNAL_AUTH_REQUIRED;
    capturedErrors.length = 0;
    globalThis.Bun.file = ((_path: string) => ({
      text: async () => 'test-ca',
    })) as unknown as typeof Bun.file;
    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === 'https://kubernetes.default.svc/openid/v1/jwks') {
        jwksFetches += 1;
        return new Response(JSON.stringify(jwks()), {
          headers: { 'content-type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    restoreEnv('API_INTERNAL_AUTH_REQUIRED', originalAuthRequired);
    globalThis.Bun.file = originalBunFile;
    globalThis.fetch = originalFetch;
  });

  const sign = (claims: Record<string, unknown>) =>
    new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

  const hit = (token: string) => {
    delete process.env.API_INTERNAL_AUTH_REQUIRED;
    return jwtApp().handle(
      new Request('http://localhost/', {
        headers: {
          authorization: `Bearer ${token}`,
          'x-api-user-id': 'discord-user-123',
        },
      }),
    );
  };

  test('verifies JWTs through the production JWKS flow', async () => {
    const wrongAudience = await hit(await sign({ aud: 'not-the-api' }));
    expect(wrongAudience.status).toBe(403);
    expect(await wrongAudience.json()).toEqual(['JWT validation failed']);
    expect(capturedErrors).toHaveLength(1);

    const malformed = await hit('not-a-jwt');
    expect(malformed.status).toBe(500);
    expect(capturedErrors).toHaveLength(1);

    const valid = await hit(await sign({ aud: 'api' }));
    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ userId: 'discord-user-123' });
    expect(capturedErrors).toHaveLength(1);
  });

  test('memoizes JWKS construction across concurrent auth(true) requests', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 5 }, () => sign({ aud: 'api' })),
    );
    const responses = await Promise.all(tokens.map(hit));
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ userId: 'discord-user-123' });
    }

    // All five concurrent requests verified through one shared remote JWKS
    // set, which fetched the endpoint exactly once. Constructing the JWKS per
    // request would fetch once per request.
    expect(jwksFetches).toBe(1);
  });
});
