import { afterEach, describe, expect, test } from 'bun:test';
import {
  discordChallengeBatches,
  discordChallengeMapHistory,
  mapGroups,
  maps,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import {
  claimDailyChallengeGeneration,
  getOrCreateDailyChallengeBatch,
  releaseDailyChallengeGeneration,
} from '@api/lib/internal/discord-challenges';
import { eq } from 'drizzle-orm';
import { discordBotRouter } from './discord-bot';

const RECENCY_FILTER_ENV = 'DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED';
const originalFetch = globalThis.fetch;
const originalNfcaToken = process.env.NFCA_TOKEN;
const originalRecencyFilter = process.env[RECENCY_FILTER_ENV];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalNfcaToken === undefined) {
    delete process.env.NFCA_TOKEN;
  } else {
    process.env.NFCA_TOKEN = originalNfcaToken;
  }
  if (originalRecencyFilter === undefined) {
    delete process.env[RECENCY_FILTER_ENV];
  } else {
    process.env[RECENCY_FILTER_ENV] = originalRecencyFilter;
  }
});

async function isDiscordVerifiedRequest(id: string): Promise<Response> {
  return discordBotRouter.handle(
    new Request(
      `http://localhost/discord-bot/users/${encodeURIComponent(id)}/is-discord-verified`,
    ),
  );
}

async function verifiedMessageRequest(id: string): Promise<Response> {
  return discordBotRouter.handle(
    new Request(
      `http://localhost/discord-bot/users/${encodeURIComponent(id)}/verified-message`,
      { method: 'POST' },
    ),
  );
}

async function seedUser(
  id: string,
  isDiscordVerified: boolean,
  discordVerifiedMessages: number | null,
) {
  await db.insert(users).values({
    id,
    username: id,
    isDiscordVerified,
    discordVerifiedMessages,
  });
}

const DEFAULT_CHALLENGE_SETTINGS = {
  time_limit: 0,
  forbid_moving: true,
  forbid_rotating: false,
  forbid_zooming: false,
};

type DailyChallengesBody = {
  batchId: string;
  date: string;
  challenges: Array<{
    geoguessrId: string;
    authors: string | null;
    difficulty: number;
    url: string;
  }>;
};

async function dailyChallengesRequest(
  settings: typeof DEFAULT_CHALLENGE_SETTINGS = DEFAULT_CHALLENGE_SETTINGS,
): Promise<Response> {
  return discordBotRouter.handle(
    new Request('http://localhost/discord-bot/daily-challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),
  );
}

async function seedChallengeMaps(modifiedAt = Math.floor(Date.now() / 1000)) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Challenge maps' })
    .returning({ id: mapGroups.id });
  const now = Math.floor(Date.now() / 1000);
  await db.insert(maps).values([
    ...[1, 2, 3].flatMap((difficulty) =>
      [1, 2].map((number) => ({
        mapGroupId: group!.id,
        name: `Difficulty ${difficulty} Map ${number}`,
        geoguessrId: `difficulty-${difficulty}-${number}`,
        authors: `Mapper ${difficulty}-${number}`,
        isPublished: true,
        difficulty,
        modifiedAt,
      })),
    ),
    {
      mapGroupId: group!.id,
      name: 'Abandoned Map',
      geoguessrId: 'abandoned',
      authors: 'Former Mapper',
      isPublished: true,
      difficulty: 1,
      modifiedAt: now - 100 * 86_400,
    },
    {
      mapGroupId: group!.id,
      name: 'Draft Map',
      geoguessrId: 'draft',
      isPublished: false,
      difficulty: 2,
      modifiedAt: now,
    },
  ]);
}

function challengeMapFromRequest(init: RequestInit | undefined): string {
  const request: unknown = JSON.parse(String(init?.body));
  if (typeof request !== 'object' || request === null || !('map' in request)) {
    throw new Error('GeoGuessr request has no map');
  }
  const map = request.map;
  if (typeof map !== 'string') {
    throw new Error('GeoGuessr request map must be a string');
  }
  return map;
}

function mockSuccessfulChallengeGeneration(calls: string[]) {
  process.env.NFCA_TOKEN = 'test';
  globalThis.fetch = (async (_input, init) => {
    const map = challengeMapFromRequest(init);
    calls.push(map);
    return Response.json({ token: `token-${map}` });
  }) as typeof fetch;
}

describe('POST /discord-bot/daily-challenges', () => {
  test('creates once and replays the completed daily batch', async () => {
    delete process.env[RECENCY_FILTER_ENV];
    await seedChallengeMaps();
    const generatedMaps: string[] = [];
    mockSuccessfulChallengeGeneration(generatedMaps);

    const firstResponse = await dailyChallengesRequest();
    const firstBody = (await firstResponse.json()) as DailyChallengesBody;
    const secondResponse = await dailyChallengesRequest();
    const secondBody = (await secondResponse.json()) as DailyChallengesBody;

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondBody).toEqual(firstBody);
    expect(firstBody.batchId).toBeString();
    expect(firstBody.date).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
    expect(firstBody.challenges).toHaveLength(6);
    expect(generatedMaps).toHaveLength(6);
    for (const difficulty of [1, 2, 3]) {
      expect(
        firstBody.challenges.filter(
          (challenge) => challenge.difficulty === difficulty,
        ),
      ).toHaveLength(2);
    }
    expect(
      firstBody.challenges.some(
        (challenge) => challenge.geoguessrId === 'abandoned',
      ),
    ).toBe(false);
    expect(
      firstBody.challenges.every(
        (challenge) =>
          challenge.authors?.startsWith('Mapper ') &&
          challenge.url.startsWith(
            'https://www.geoguessr.com/challenge/token-',
          ),
      ),
    ).toBe(true);

    const batches = await db.select().from(discordChallengeBatches);
    const history = await db.select().from(discordChallengeMapHistory);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.status).toBe('complete');
    expect(history).toHaveLength(6);
    expect(history.every((entry) => entry.challengeUrl !== null)).toBe(true);
    expect(new Set(history.map((entry) => entry.batchId))).toEqual(
      new Set([firstBody.batchId]),
    );
  });

  test('allows stale maps when the recency filter is disabled', async () => {
    process.env[RECENCY_FILTER_ENV] = 'false';
    await seedChallengeMaps(Math.floor(Date.now() / 1000) - 100 * 86_400);
    mockSuccessfulChallengeGeneration([]);

    const response = await dailyChallengesRequest();

    expect(response.status).toBe(200);
    expect(await db.select().from(discordChallengeMapHistory)).toHaveLength(6);
  });

  test('persists successful URLs and resumes only missing generation', async () => {
    delete process.env[RECENCY_FILTER_ENV];
    await seedChallengeMaps();
    process.env.NFCA_TOKEN = 'test';
    const generatedMaps: string[] = [];
    let failedOnce = false;
    globalThis.fetch = (async (_input, init) => {
      const map = challengeMapFromRequest(init);
      generatedMaps.push(map);
      if (map === 'difficulty-1-1' && !failedOnce) {
        failedOnce = true;
        return new Response('upstream unavailable', { status: 503 });
      }
      return Response.json({ token: `token-${map}` });
    }) as typeof fetch;

    const failedResponse = await dailyChallengesRequest();

    expect(failedResponse.status).toBe(502);
    const [pendingBatch] = await db.select().from(discordChallengeBatches);
    const partialHistory = await db.select().from(discordChallengeMapHistory);
    expect(pendingBatch?.status).toBe('pending');
    expect(
      partialHistory.filter((entry) => entry.challengeUrl !== null),
    ).toHaveLength(5);

    const resumedResponse = await dailyChallengesRequest();
    const resumedBody = (await resumedResponse.json()) as DailyChallengesBody;
    const replayResponse = await dailyChallengesRequest();
    const replayBody = (await replayResponse.json()) as DailyChallengesBody;

    expect(resumedResponse.status).toBe(200);
    expect(replayResponse.status).toBe(200);
    expect(resumedBody.batchId).toBe(pendingBatch?.id);
    expect(replayBody).toEqual(resumedBody);
    expect(generatedMaps).toHaveLength(7);
    const completedHistory = await db.select().from(discordChallengeMapHistory);
    expect(completedHistory.every((entry) => entry.challengeUrl !== null)).toBe(
      true,
    );
  });

  test('prevents an expired worker from releasing a newer lease', async () => {
    await seedChallengeMaps();
    const batch = await getOrCreateDailyChallengeBatch(
      DEFAULT_CHALLENGE_SETTINGS,
    );
    const firstClaim = await claimDailyChallengeGeneration(batch.batchId, 1000);
    const secondClaim = await claimDailyChallengeGeneration(
      batch.batchId,
      1000 + 121,
    );
    expect(firstClaim.state).toBe('claimed');
    expect(secondClaim.state).toBe('claimed');
    if (firstClaim.state !== 'claimed' || secondClaim.state !== 'claimed') {
      throw new Error('expected generation claims');
    }

    await releaseDailyChallengeGeneration(batch.batchId, firstClaim.leaseToken);

    const [stillClaimed] = await db
      .select()
      .from(discordChallengeBatches)
      .where(eq(discordChallengeBatches.id, batch.batchId));
    expect(stillClaimed?.status).toBe('generating');
    expect(stillClaimed?.leaseToken).toBe(secondClaim.leaseToken);

    await releaseDailyChallengeGeneration(
      batch.batchId,
      secondClaim.leaseToken,
    );
    const [released] = await db
      .select()
      .from(discordChallengeBatches)
      .where(eq(discordChallengeBatches.id, batch.batchId));
    expect(released?.status).toBe('pending');
    expect(released?.leaseToken).toBeNull();
  });

  test('rejects changed settings for an existing daily batch', async () => {
    await seedChallengeMaps();
    const generatedMaps: string[] = [];
    mockSuccessfulChallengeGeneration(generatedMaps);
    expect((await dailyChallengesRequest()).status).toBe(200);

    const response = await dailyChallengesRequest({
      ...DEFAULT_CHALLENGE_SETTINGS,
      time_limit: 30,
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'Daily challenge settings differ from the existing batch',
    });
    expect(generatedMaps).toHaveLength(6);
  });

  test('rolls back when a difficulty has fewer than two eligible maps', async () => {
    delete process.env[RECENCY_FILTER_ENV];
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Insufficient maps' })
      .returning({ id: mapGroups.id });
    await db.insert(maps).values({
      mapGroupId: group!.id,
      name: 'Only Beginner',
      geoguessrId: 'only-beginner',
      isPublished: true,
      difficulty: 1,
      modifiedAt: Math.floor(Date.now() / 1000),
    });

    const response = await dailyChallengesRequest();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'Difficulty 1 needs 2 eligible maps, found 1',
    });
    expect(await db.select().from(discordChallengeBatches)).toEqual([]);
    expect(await db.select().from(discordChallengeMapHistory)).toEqual([]);
  });
});

describe('GET /discord-bot/users/:id/is-discord-verified', () => {
  test('returns false for a non-existent user', async () => {
    const response = await isDiscordVerifiedRequest('missing-user');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isDiscordVerified: false });
  });

  test('returns false for an unverified user', async () => {
    await seedUser('unverified', false, 2);

    const response = await isDiscordVerifiedRequest('unverified');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isDiscordVerified: false });
  });

  test('returns true for a verified user', async () => {
    await seedUser('verified', true, 5);

    const response = await isDiscordVerifiedRequest('verified');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isDiscordVerified: true });
  });
});

describe('POST /discord-bot/users/:id/verified-message', () => {
  test('creates a new user with a counter of one', async () => {
    const response = await verifiedMessageRequest('new-user');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      isDiscordVerified: false,
      discordVerifiedMessages: 1,
    });

    const [user] = await db
      .select({
        id: users.id,
        isDiscordVerified: users.isDiscordVerified,
        discordVerifiedMessages: users.discordVerifiedMessages,
      })
      .from(users)
      .where(eq(users.id, 'new-user'));
    expect(user).toEqual({
      id: 'new-user',
      isDiscordVerified: false,
      discordVerifiedMessages: 1,
    });
  });

  test('increments the counter for an existing user', async () => {
    await seedUser('existing', false, 2);

    const response = await verifiedMessageRequest('existing');

    expect(await response.json()).toEqual({
      isDiscordVerified: false,
      discordVerifiedMessages: 3,
    });
  });

  test('handles a null counter for an existing user', async () => {
    await seedUser('null-counter', false, null);

    const response = await verifiedMessageRequest('null-counter');

    expect(await response.json()).toEqual({
      isDiscordVerified: false,
      discordVerifiedMessages: 1,
    });
  });

  test('flips to verified when the counter reaches the threshold', async () => {
    await seedUser('almost', false, 4);

    const response = await verifiedMessageRequest('almost');

    expect(await response.json()).toEqual({
      isDiscordVerified: true,
      discordVerifiedMessages: 5,
    });
  });

  test('keeps an already verified user verified', async () => {
    await seedUser('already', true, 5);

    const response = await verifiedMessageRequest('already');

    expect(await response.json()).toEqual({
      isDiscordVerified: true,
      discordVerifiedMessages: 6,
    });
  });
});
