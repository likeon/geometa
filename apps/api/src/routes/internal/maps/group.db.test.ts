import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { asc, eq } from 'drizzle-orm';
import { app } from '../../../api';
import {
  levels,
  mapFilters,
  mapGroupPermissions,
  mapGroups,
  mapLevels,
  mapRegions,
  maps,
  regions,
  users,
} from '../../../lib/db/schema';
import { db } from '../../../lib/drizzle';
import { popularMapMessage } from '../../../lib/internal/utils';

const originalFetch = globalThis.fetch;
const originalNfcaToken = process.env.NFCA_TOKEN;

let geoguessrFetches: string[] = [];
// geoguessrId -> numberOfGamesPlayed for the popularity search mock; an
// unlisted ID resolves to no search result (not popular)
let geoguessrMapResults: Record<string, number> = {};

// Fail closed: superadmins skip the popularity lookup, so a geoguessr call here
// means the route reached an external boundary and the test must surface it.
function mockFetchFailClosed() {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith('https://www.geoguessr.com/api/v3/search/map')) {
      const q = new URL(url).searchParams.get('q') ?? '';
      geoguessrFetches.push(q);
      const numberOfGamesPlayed = geoguessrMapResults[q];
      const body =
        numberOfGamesPlayed === undefined
          ? []
          : [{ id: q, numberOfGamesPlayed }];
      return new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`Unexpected external request: ${url}`);
  }) as unknown as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function restoreNfcaToken() {
  if (originalNfcaToken === undefined) {
    delete process.env.NFCA_TOKEN;
  } else {
    process.env.NFCA_TOKEN = originalNfcaToken;
  }
}

async function seedUser(id: string, isSuperadmin = false, isTrusted = false) {
  await db.insert(users).values({
    id,
    username: id,
    isSuperadmin,
    isTrusted,
  });
}

async function seedGroupOwner(userId: string, groupId: number) {
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role: 'owner',
  });
}

async function seedGroup(name: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  return group!.id;
}

async function seedLevel(groupId: number, name: string) {
  const [level] = await db
    .insert(levels)
    .values({ mapGroupId: groupId, name })
    .returning({ id: levels.id });
  return level!.id;
}

async function seedRegion(name: string) {
  const [region] = await db
    .insert(regions)
    .values({ name })
    .returning({ id: regions.id });
  return region!.id;
}

function groupMapBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Map Name',
    description: 'Map description',
    geoguessrId: 'group-map-1',
    mapGroupId: 1,
    footer: '**Footer**',
    isPublished: true,
    isShared: true,
    authors: 'Author',
    ordering: 3,
    autoUpdate: true,
    difficulty: 2,
    isVerified: true,
    levels: [],
    regions: [],
    includeFilters: [],
    excludeFilters: [],
    ...overrides,
  };
}

function groupMapPutRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/maps/group', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe('PUT /api/internal/maps/group', () => {
  beforeEach(() => {
    // geoguessrAPIFetch throws before any network call without this token
    process.env.NFCA_TOKEN = 'test-token';
    geoguessrFetches = [];
    geoguessrMapResults = {};
    mockFetchFailClosed();
  });

  afterEach(() => {
    restoreFetch();
    restoreNfcaToken();
  });

  test('create persists base fields and the level/filter/region associations', async () => {
    await seedUser('admin-1', true);
    const groupId = await seedGroup('Test group');
    const levelA = await seedLevel(groupId, 'Beginner');
    const levelB = await seedLevel(groupId, 'Advanced');
    const regionA = await seedRegion('Europe');
    const regionB = await seedRegion('Asia');
    const before = Math.floor(Date.now() / 1000);

    const response = await groupMapPutRequest(
      'admin-1',
      groupMapBody({
        mapGroupId: groupId,
        levels: [levelA, levelB],
        regions: [regionA, regionB],
        includeFilters: ['us', 'ca'],
        excludeFilters: ['dangerous'],
      }),
    );

    expect(response.status).toBe(200);
    const { id } = (await response.json()) as { id: number };
    expect(id).toEqual(expect.any(Number));
    // superadmin bypasses the GeoGuessr popularity lookup
    expect(geoguessrFetches).toEqual([]);

    const [row] = await db.select().from(maps).where(eq(maps.id, id));
    const after = Math.floor(Date.now() / 1000);
    expect(row).toEqual(
      expect.objectContaining({
        id,
        mapGroupId: groupId,
        name: 'Map Name',
        geoguessrId: 'group-map-1',
        description: 'Map description',
        isPublished: true,
        isShared: true,
        isPersonal: false,
        userId: null,
        authors: 'Author',
        ordering: 3,
        autoUpdate: true,
        footer: '**Footer**',
        footerHtml: '<p><strong>Footer</strong></p>',
        modifiedAt: expect.any(Number),
        difficulty: 2,
        isVerified: true,
      }),
    );
    expect(row!.modifiedAt).toBeGreaterThanOrEqual(before);
    expect(row!.modifiedAt).toBeLessThanOrEqual(after);

    const levelRows = await db
      .select({ mapId: mapLevels.mapId, levelId: mapLevels.levelId })
      .from(mapLevels)
      .where(eq(mapLevels.mapId, id))
      .orderBy(asc(mapLevels.levelId));
    expect(levelRows).toEqual([
      { mapId: id, levelId: levelA },
      { mapId: id, levelId: levelB },
    ]);

    const filterRows = await db
      .select({ tagLike: mapFilters.tagLike, isExclude: mapFilters.isExclude })
      .from(mapFilters)
      .where(eq(mapFilters.mapId, id))
      .orderBy(asc(mapFilters.tagLike));
    expect(filterRows).toEqual([
      { tagLike: 'ca', isExclude: false },
      { tagLike: 'dangerous', isExclude: true },
      { tagLike: 'us', isExclude: false },
    ]);

    const regionRows = await db
      .select({ regionId: mapRegions.regionId })
      .from(mapRegions)
      .where(eq(mapRegions.mapId, id))
      .orderBy(asc(mapRegions.regionId));
    expect(regionRows).toEqual([{ regionId: regionA }, { regionId: regionB }]);
  });

  test('update replaces base fields and all associations without stale or duplicate rows', async () => {
    await seedUser('admin-1', true);
    const groupId = await seedGroup('Test group');
    const levelA = await seedLevel(groupId, 'Beginner');
    const levelB = await seedLevel(groupId, 'Advanced');
    const levelC = await seedLevel(groupId, 'Expert');
    const regionA = await seedRegion('Europe');
    const regionB = await seedRegion('Asia');

    const created = await groupMapPutRequest(
      'admin-1',
      groupMapBody({
        mapGroupId: groupId,
        levels: [levelA, levelB],
        regions: [regionA, regionB],
        includeFilters: ['us', 'ca'],
        excludeFilters: ['dangerous'],
      }),
    );
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const updated = await groupMapPutRequest(
      'admin-1',
      groupMapBody({
        id,
        mapGroupId: groupId,
        name: 'Renamed Map',
        geoguessrId: 'group-map-1',
        description: null,
        footer: 'New footer',
        isPublished: false,
        isShared: false,
        authors: null,
        ordering: 0,
        autoUpdate: false,
        difficulty: 5,
        isVerified: false,
        levels: [levelB, levelC],
        regions: [],
        includeFilters: ['ca'],
        excludeFilters: [],
      }),
    );

    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ id });
    // unchanged GeoGuessr ID, so no external lookup on update either
    expect(geoguessrFetches).toEqual([]);

    const [row] = await db.select().from(maps).where(eq(maps.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        id,
        mapGroupId: groupId,
        name: 'Renamed Map',
        geoguessrId: 'group-map-1',
        description: null,
        isPublished: false,
        isShared: false,
        authors: null,
        ordering: 0,
        autoUpdate: false,
        footer: 'New footer',
        footerHtml: '<p>New footer</p>',
        difficulty: 5,
        isVerified: false,
      }),
    );

    // level A removed, level C added, level B retained exactly once
    const levelRows = await db
      .select({ mapId: mapLevels.mapId, levelId: mapLevels.levelId })
      .from(mapLevels)
      .where(eq(mapLevels.mapId, id))
      .orderBy(asc(mapLevels.levelId));
    expect(levelRows).toEqual([
      { mapId: id, levelId: levelB },
      { mapId: id, levelId: levelC },
    ]);

    // include 'us' and exclude 'dangerous' removed, include 'ca' retained once
    const filterRows = await db
      .select({ tagLike: mapFilters.tagLike, isExclude: mapFilters.isExclude })
      .from(mapFilters)
      .where(eq(mapFilters.mapId, id))
      .orderBy(asc(mapFilters.tagLike));
    expect(filterRows).toEqual([{ tagLike: 'ca', isExclude: false }]);

    // both regions removed
    const regionRows = await db
      .select({ regionId: mapRegions.regionId })
      .from(mapRegions)
      .where(eq(mapRegions.mapId, id))
      .orderBy(asc(mapRegions.regionId));
    expect(regionRows).toEqual([]);
  });

  describe('field gating by caller role', () => {
    test('create: gated fields fall back to defaults unless the role unlocks them', async () => {
      await seedUser('owner-1');
      await seedUser('trusted-1', false, true);
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);
      await seedGroupOwner('trusted-1', groupId);

      // every caller requests full privileges; only the role grants them
      const requested = {
        isPublished: true,
        ordering: 7,
        autoUpdate: true,
        isVerified: true,
      };

      const ownerResponse = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'owner-map',
          ...requested,
        }),
      );
      const trustedResponse = await groupMapPutRequest(
        'trusted-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'trusted-map',
          ...requested,
        }),
      );
      const adminResponse = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'admin-map',
          ...requested,
        }),
      );

      expect(ownerResponse.status).toBe(200);
      expect(trustedResponse.status).toBe(200);
      expect(adminResponse.status).toBe(200);
      const { id: ownerId } = (await ownerResponse.json()) as { id: number };
      const { id: trustedId } = (await trustedResponse.json()) as {
        id: number;
      };
      const { id: adminId } = (await adminResponse.json()) as { id: number };

      // Plain owner: publication needs trusted status; remaining fields need superadmin.
      const [ownerRow] = await db
        .select()
        .from(maps)
        .where(eq(maps.id, ownerId));
      expect(ownerRow).toEqual(
        expect.objectContaining({
          isPublished: false,
          ordering: 0,
          autoUpdate: false,
          isVerified: false,
          // ungated fields are honored for every role
          name: 'Map Name',
          description: 'Map description',
          isShared: true,
          authors: 'Author',
          difficulty: 2,
        }),
      );

      // trusted owner: isPublished honored, superadmin-only fields default
      const [trustedRow] = await db
        .select()
        .from(maps)
        .where(eq(maps.id, trustedId));
      expect(trustedRow).toEqual(
        expect.objectContaining({
          isPublished: true,
          ordering: 0,
          autoUpdate: false,
          isVerified: false,
        }),
      );

      // superadmin: every requested value honored
      const [adminRow] = await db
        .select()
        .from(maps)
        .where(eq(maps.id, adminId));
      expect(adminRow).toEqual(
        expect.objectContaining({
          isPublished: true,
          ordering: 7,
          autoUpdate: true,
          isVerified: true,
        }),
      );

      // owner and trusted creates hit the GeoGuessr popularity check;
      // the superadmin create bypasses it
      expect(geoguessrFetches).toEqual(['owner-map', 'trusted-map']);
    });

    test('superadmin create honors explicit false and ordering 0', async () => {
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Test group');

      const response = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'admin-zero-map',
          isPublished: false,
          ordering: 0,
          autoUpdate: false,
          isVerified: false,
        }),
      );

      expect(response.status).toBe(200);
      const { id } = (await response.json()) as { id: number };
      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row).toEqual(
        expect.objectContaining({
          isPublished: false,
          ordering: 0,
          autoUpdate: false,
          isVerified: false,
        }),
      );
      // falsy values are real values, not omission markers
      expect(geoguessrFetches).toEqual([]);
    });

    test('update retains gated fields unless the caller role unlocks them', async () => {
      await seedUser('owner-1');
      await seedUser('trusted-1', false, true);
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);
      await seedGroupOwner('trusted-1', groupId);

      const created = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'retained-map',
          isPublished: true,
          ordering: 7,
          autoUpdate: true,
          isVerified: true,
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      const clearRequest = groupMapBody({
        id,
        mapGroupId: groupId,
        geoguessrId: 'retained-map',
        isPublished: false,
        ordering: 0,
        autoUpdate: false,
        isVerified: false,
      });

      // plain owner asks to clear every gated field; nothing may change
      const ownerUpdate = await groupMapPutRequest('owner-1', clearRequest);
      expect(ownerUpdate.status).toBe(200);
      const [afterOwner] = await db.select().from(maps).where(eq(maps.id, id));
      expect(afterOwner).toEqual(
        expect.objectContaining({
          isPublished: true,
          ordering: 7,
          autoUpdate: true,
          isVerified: true,
        }),
      );

      // trusted owner unlocks isPublished but not the superadmin-only fields
      const trustedUpdate = await groupMapPutRequest('trusted-1', clearRequest);
      expect(trustedUpdate.status).toBe(200);
      const [afterTrusted] = await db
        .select()
        .from(maps)
        .where(eq(maps.id, id));
      expect(afterTrusted).toEqual(
        expect.objectContaining({
          isPublished: false,
          ordering: 7,
          autoUpdate: true,
          isVerified: true,
        }),
      );

      // superadmin unlocks everything, including explicit false and ordering 0
      const adminUpdate = await groupMapPutRequest('admin-1', clearRequest);
      expect(adminUpdate.status).toBe(200);
      const [afterAdmin] = await db.select().from(maps).where(eq(maps.id, id));
      expect(afterAdmin).toEqual(
        expect.objectContaining({
          isPublished: false,
          ordering: 0,
          autoUpdate: false,
          isVerified: false,
        }),
      );

      // unchanged GeoGuessr ID means no external lookup on any update
      expect(geoguessrFetches).toEqual([]);
    });
  });

  describe('GeoGuessr popularity check', () => {
    test('update with a changed GeoGuessr ID looks up the new ID externally', async () => {
      await seedUser('owner-1');
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);

      const created = await groupMapPutRequest(
        'owner-1',
        groupMapBody({ mapGroupId: groupId, geoguessrId: 'original-id' }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      geoguessrFetches = [];
      const updated = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          id,
          mapGroupId: groupId,
          geoguessrId: 'changed-id',
        }),
      );
      expect(updated.status).toBe(200);
      // only the new ID is queried, never the unchanged one
      expect(geoguessrFetches).toEqual(['changed-id']);
      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row!.geoguessrId).toBe('changed-id');
    });

    test('rejects exactly above the popularity threshold and allows exactly at it', async () => {
      await seedUser('owner-1');
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);

      geoguessrMapResults = { 'boundary-map': 10001 };
      const rejected = await groupMapPutRequest(
        'owner-1',
        groupMapBody({ mapGroupId: groupId, geoguessrId: 'boundary-map' }),
      );
      expect(rejected.status).toBe(403);
      expect(await rejected.json()).toEqual({ message: popularMapMessage });
      expect(geoguessrFetches).toEqual(['boundary-map']);
      // rejection happens before the insert transaction: nothing persisted
      const rejectedRows = await db
        .select()
        .from(maps)
        .where(eq(maps.geoguessrId, 'boundary-map'));
      expect(rejectedRows).toEqual([]);

      geoguessrMapResults = { 'boundary-map': 10000 };
      const allowed = await groupMapPutRequest(
        'owner-1',
        groupMapBody({ mapGroupId: groupId, geoguessrId: 'boundary-map' }),
      );
      expect(allowed.status).toBe(200);
      const { id } = (await allowed.json()) as { id: number };
      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row!.geoguessrId).toBe('boundary-map');
    });

    test('rejected update to a popular GeoGuessr ID keeps the old map intact', async () => {
      await seedUser('owner-1');
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);
      const oldLevelId = await seedLevel(groupId, 'Old level');
      const newLevelId = await seedLevel(groupId, 'New level');

      const created = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'stable-id',
          levels: [oldLevelId],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      geoguessrFetches = [];
      geoguessrMapResults = { 'popular-id': 20000 };
      const updated = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          id,
          mapGroupId: groupId,
          geoguessrId: 'popular-id',
          name: 'Should Not Persist',
          levels: [newLevelId],
        }),
      );
      expect(updated.status).toBe(403);
      expect(await updated.json()).toEqual({ message: popularMapMessage });
      expect(geoguessrFetches).toEqual(['popular-id']);

      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row).toEqual(
        expect.objectContaining({
          id,
          geoguessrId: 'stable-id',
          name: 'Map Name',
        }),
      );
      expect(
        await db
          .select({ levelId: mapLevels.levelId })
          .from(mapLevels)
          .where(eq(mapLevels.mapId, id)),
      ).toEqual([{ levelId: oldLevelId }]);
    });

    test('superadmin update with a changed GeoGuessr ID bypasses the lookup', async () => {
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Test group');

      const created = await groupMapPutRequest(
        'admin-1',
        groupMapBody({ mapGroupId: groupId, geoguessrId: 'original-id' }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };
      expect(geoguessrFetches).toEqual([]);

      const updated = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          id,
          mapGroupId: groupId,
          geoguessrId: 'changed-id',
          name: 'Superadmin Rename',
        }),
      );
      expect(updated.status).toBe(200);
      // even a changed ID never reaches the GeoGuessr API for superadmins
      expect(geoguessrFetches).toEqual([]);
      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row).toEqual(
        expect.objectContaining({
          id,
          geoguessrId: 'changed-id',
          name: 'Superadmin Rename',
        }),
      );
    });
  });

  describe('transactional rollback', () => {
    test('invalid association rolls back the base map row and every association set', async () => {
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Test group');
      const levelA = await seedLevel(groupId, 'Beginner');
      const levelB = await seedLevel(groupId, 'Advanced');
      const regionA = await seedRegion('Europe');
      const regionB = await seedRegion('Asia');

      const created = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'stable-id',
          levels: [levelA],
          regions: [regionA],
          includeFilters: ['us'],
          excludeFilters: ['dangerous'],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      // Nonexistent region id 999999: the region insert is the last data
      // mutation in the transaction, so a rollback must restore the base row
      // and the level/filter/region mutations that already ran.
      const failed = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          id,
          mapGroupId: groupId,
          geoguessrId: 'stable-id',
          name: 'Should Not Persist',
          levels: [levelB],
          regions: [regionB, 999999],
          includeFilters: ['ca'],
          excludeFilters: [],
        }),
      );
      // FK violation is not a GeoGuessr-ID conflict: it propagates as 500
      expect(failed.status).toBe(500);

      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row).toEqual(
        expect.objectContaining({
          id,
          geoguessrId: 'stable-id',
          name: 'Map Name',
          description: 'Map description',
        }),
      );

      // level A was not deleted, level B was not inserted
      expect(
        await db
          .select({ levelId: mapLevels.levelId })
          .from(mapLevels)
          .where(eq(mapLevels.mapId, id)),
      ).toEqual([{ levelId: levelA }]);

      // 'us' and 'dangerous' were not deleted, 'ca' was not inserted
      const filterRows = await db
        .select({
          tagLike: mapFilters.tagLike,
          isExclude: mapFilters.isExclude,
        })
        .from(mapFilters)
        .where(eq(mapFilters.mapId, id))
        .orderBy(asc(mapFilters.tagLike));
      expect(filterRows).toEqual([
        { tagLike: 'dangerous', isExclude: true },
        { tagLike: 'us', isExclude: false },
      ]);

      // region A remains, region B and the invalid id were not inserted
      expect(
        await db
          .select({ regionId: mapRegions.regionId })
          .from(mapRegions)
          .where(eq(mapRegions.mapId, id)),
      ).toEqual([{ regionId: regionA }]);

      // unchanged GeoGuessr ID and superadmin caller: no external lookup
      expect(geoguessrFetches).toEqual([]);
    });
  });
});
