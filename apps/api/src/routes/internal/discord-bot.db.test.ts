import { describe, expect, test } from 'bun:test';
import { users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { eq } from 'drizzle-orm';
import { discordBotRouter } from './discord-bot';

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
