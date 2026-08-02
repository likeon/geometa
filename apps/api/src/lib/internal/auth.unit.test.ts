import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { auth, bearer } from './auth';

const originalAuthRequired = process.env.API_INTERNAL_AUTH_REQUIRED;
const originalFrontendToken = process.env.FRONTEND_API_TOKEN;

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
