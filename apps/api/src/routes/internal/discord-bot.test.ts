import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { discordBotRouter } from './discord-bot';

const originalFetch = globalThis.fetch;
const originalNfcaToken = process.env.NFCA_TOKEN;
const requestBody = {
  geoguessr_map_id: '699617147156b7076362bd45',
  time_limit: 0,
  forbid_moving: true,
  forbid_rotating: false,
  forbid_zooming: false,
};

beforeEach(() => {
  process.env.NFCA_TOKEN = 'test';
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalNfcaToken === undefined) {
    delete process.env.NFCA_TOKEN;
  } else {
    process.env.NFCA_TOKEN = originalNfcaToken;
  }
});

describe('POST /discord-bot/challenges', () => {
  test('creates a GeoGuessr challenge and returns its URL', async () => {
    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe('https://www.geoguessr.com/api/v3/challenges');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        forbidMoving: true,
        forbidRotating: false,
        forbidZooming: false,
        map: '699617147156b7076362bd45',
        rounds: 5,
        timeLimit: 0,
      });
      return Response.json({ token: 'token/value', ignored: true });
    }) as typeof fetch;

    const response = await challengeRequest(requestBody);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://www.geoguessr.com/challenge/token%2Fvalue',
    });
  });

  test('sanitizes GeoGuessr failures', async () => {
    globalThis.fetch = (async () =>
      new Response('upstream details', {
        status: 503,
      })) as unknown as typeof fetch;

    const response = await challengeRequest(requestBody);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: 'Failed to create GeoGuessr challenge',
    });
  });

  test('rejects blank challenge tokens', async () => {
    globalThis.fetch = (async () =>
      Response.json({ token: '   ' })) as unknown as typeof fetch;

    const response = await challengeRequest(requestBody);

    expect(response.status).toBe(502);
  });
});

function challengeRequest(body: unknown): Promise<Response> {
  return discordBotRouter.handle(
    new Request('http://localhost/discord-bot/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
