import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  levels,
  mapFilters,
  mapGroupChanges,
  mapGroupLocationMetas,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  mapLevels,
  mapLocations,
  mapRegions,
  maps,
  metas,
  regions,
  syncedMapMetas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { popularMapMessage } from '@api/lib/internal/utils';
import { and, asc, eq } from 'drizzle-orm';

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

function groupMapDeleteRequest(userId: string, mapId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/maps/group/${mapId}`, {
      method: 'DELETE',
      headers: { 'x-api-user-id': userId },
    }),
  );
}

function groupMapDownloadRequest(
  userId: string,
  mapId: number,
  groupId: number,
) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/maps/group/${mapId}/download?groupId=${groupId}`,
      { headers: { 'x-api-user-id': userId } },
    ),
  );
}

function groupMapBalanceRequest(
  userId: string,
  mapId: number,
  groupId: number,
) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/maps/group/${mapId}/meta-balance?groupId=${groupId}`,
      { headers: { 'x-api-user-id': userId } },
    ),
  );
}

async function getMapLogs() {
  return db
    .select({
      mapGroupId: mapGroupChanges.mapGroupId,
      userId: mapGroupChanges.userId,
      entityType: mapGroupChanges.entityType,
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
      createdAt: mapGroupChanges.createdAt,
    })
    .from(mapGroupChanges)
    .where(eq(mapGroupChanges.entityType, 'map'))
    .orderBy(asc(mapGroupChanges.id));
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

  describe('moving between groups', () => {
    test('owner of source and target moves the map and logs exact source delete / target create', async () => {
      await seedUser('owner-1');
      const sourceId = await seedGroup('Source group');
      const targetId = await seedGroup('Target group');
      await seedGroupOwner('owner-1', sourceId);
      await seedGroupOwner('owner-1', targetId);
      const sourceLevelId = await seedLevel(sourceId, 'Beginner');
      const targetLevelId = await seedLevel(targetId, 'Beginner');
      const regionId = await seedRegion('Europe');

      const created = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          mapGroupId: sourceId,
          geoguessrId: 'moved-map',
          levels: [sourceLevelId],
          regions: [regionId],
          includeFilters: ['us'],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      geoguessrFetches = [];
      const moved = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          id,
          mapGroupId: targetId,
          geoguessrId: 'moved-map',
          levels: [targetLevelId],
          regions: [regionId],
          includeFilters: ['us'],
        }),
      );
      expect(moved.status).toBe(200);
      expect(await moved.json()).toEqual({ id });
      // unchanged GeoGuessr ID: the move never reaches the external boundary
      expect(geoguessrFetches).toEqual([]);

      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row!.mapGroupId).toBe(targetId);
      expect(row!.geoguessrId).toBe('moved-map');

      // plain owner: gated fields fall back to the source map's values
      const mapDetails = {
        name: 'Map Name',
        geoguessrId: 'moved-map',
        description: 'Map description',
        isPublished: false,
        isShared: true,
        authors: 'Author',
        footer: '**Footer**',
        difficulty: 2,
        ordering: 0,
        isVerified: false,
        regions: ['Europe'],
        levels: ['Beginner'],
        includeFilters: ['us'],
        excludeFilters: [],
      };

      expect(await getMapLogs()).toEqual([
        // the original create still sits in the source group
        {
          mapGroupId: sourceId,
          userId: 'owner-1',
          entityType: 'map',
          entityId: id,
          entityLabel: 'Map Name',
          operation: 'create',
          oldValue: null,
          newValue: { mapGroupId: sourceId, ...mapDetails },
          createdAt: expect.any(Number),
        },
        // the move deletes the map from the source group...
        {
          mapGroupId: sourceId,
          userId: 'owner-1',
          entityType: 'map',
          entityId: id,
          entityLabel: 'Map Name',
          operation: 'delete',
          oldValue: { mapGroupId: sourceId, ...mapDetails },
          newValue: { movedToGroupId: targetId },
          createdAt: expect.any(Number),
        },
        // ...and creates it in the target group
        {
          mapGroupId: targetId,
          userId: 'owner-1',
          entityType: 'map',
          entityId: id,
          entityLabel: 'Map Name',
          operation: 'create',
          oldValue: null,
          newValue: {
            mapGroupId: targetId,
            ...mapDetails,
            movedFromGroupId: sourceId,
          },
          createdAt: expect.any(Number),
        },
      ]);
    });

    test('move is denied without owner access to the source group, with no mutation or log leakage', async () => {
      await seedUser('source-owner');
      await seedUser('target-owner');
      const sourceId = await seedGroup('Source group');
      const targetId = await seedGroup('Target group');
      await seedGroupOwner('source-owner', sourceId);
      await seedGroupOwner('target-owner', targetId);

      const created = await groupMapPutRequest(
        'source-owner',
        groupMapBody({ mapGroupId: sourceId, geoguessrId: 'locked-map' }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      // caller owns the target group but not the source: both are required
      geoguessrFetches = [];
      const moved = await groupMapPutRequest(
        'target-owner',
        groupMapBody({ id, mapGroupId: targetId, geoguessrId: 'locked-map' }),
      );
      expect(moved.status).toBe(403);
      expect(geoguessrFetches).toEqual([]);

      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row!.mapGroupId).toBe(sourceId);

      // only the original create log exists: no delete/create pair leaked
      expect(await getMapLogs()).toEqual([
        expect.objectContaining({
          mapGroupId: sourceId,
          userId: 'source-owner',
          operation: 'create',
        }),
      ]);
      expect(
        await db
          .select()
          .from(mapGroupChanges)
          .where(eq(mapGroupChanges.mapGroupId, targetId)),
      ).toEqual([]);
    });
  });

  describe('cross-group level rejection', () => {
    test.todo('rejects level IDs from another group before any persistence', async () => {
      // The level FK does not enforce that map and level belong to one group.
      await seedUser('admin-1', true);
      const groupId = await seedGroup('Target group');
      const otherGroupId = await seedGroup('Other group');
      const levelId = await seedLevel(groupId, 'Beginner');
      const foreignLevelId = await seedLevel(otherGroupId, 'Foreign level');

      const created = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          mapGroupId: groupId,
          geoguessrId: 'own-level-map',
          levels: [levelId],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      const rejected = await groupMapPutRequest(
        'admin-1',
        groupMapBody({
          id,
          mapGroupId: groupId,
          geoguessrId: 'own-level-map',
          name: 'Should Not Persist',
          levels: [foreignLevelId],
        }),
      );
      expect(rejected.status).toBeGreaterThanOrEqual(400);
      expect(rejected.status).toBeLessThan(500);
      expect(geoguessrFetches).toEqual([]);

      const [row] = await db.select().from(maps).where(eq(maps.id, id));
      expect(row).toEqual(
        expect.objectContaining({
          id,
          name: 'Map Name',
          geoguessrId: 'own-level-map',
        }),
      );

      expect(
        await db
          .select({ levelId: mapLevels.levelId })
          .from(mapLevels)
          .where(eq(mapLevels.mapId, id)),
      ).toEqual([{ levelId }]);

      expect(
        await db
          .select()
          .from(mapGroupChanges)
          .where(eq(mapGroupChanges.entityId, id)),
      ).toEqual([
        expect.objectContaining({
          mapGroupId: groupId,
          userId: 'admin-1',
          entityType: 'map',
          operation: 'create',
        }),
      ]);
    });
  });

  describe('id=0 validation', () => {
    test.todo('rejects id 0 by validation instead of mixing create and update behavior', async () => {
      await seedUser('owner-1');
      const groupId = await seedGroup('Test group');
      await seedGroupOwner('owner-1', groupId);

      // id=0 passes the Integer schema, so the route mixes paths: the
      // popularity check treats it as a create (`if (id)` is falsy) while the
      // transaction treats it as an update of map 0 (`id === undefined` is
      // false). No map row is touched, association inserts target a
      // nonexistent map_id, and the response is 200 { id: 0 } or 500
      // depending on the association arrays.
      const response = await groupMapPutRequest(
        'owner-1',
        groupMapBody({
          id: 0,
          mapGroupId: groupId,
          geoguessrId: 'id-zero-map',
        }),
      );
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual(
        expect.objectContaining({ type: 'validation', on: 'body' }),
      );
      // validation must reject before the handler: no external lookup
      expect(geoguessrFetches).toEqual([]);
      // and nothing may be persisted
      expect(
        await db.select().from(maps).where(eq(maps.geoguessrId, 'id-zero-map')),
      ).toEqual([]);
    });
  });
});

describe('DELETE /api/internal/maps/group/:id', () => {
  beforeEach(() => {
    // map creates inside these tests hit the GeoGuessr popularity check
    process.env.NFCA_TOKEN = 'test-token';
    geoguessrFetches = [];
    geoguessrMapResults = {};
    mockFetchFailClosed();
  });

  afterEach(() => {
    restoreFetch();
    restoreNfcaToken();
  });

  test('owner delete cascades map associations and leaves unrelated rows', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Test group');
    await seedGroupOwner('owner-1', groupId);
    const levelId = await seedLevel(groupId, 'Beginner');
    const regionId = await seedRegion('Europe');

    const created = await groupMapPutRequest(
      'owner-1',
      groupMapBody({
        mapGroupId: groupId,
        geoguessrId: 'doomed-map',
        levels: [levelId],
        regions: [regionId],
        includeFilters: ['us'],
        excludeFilters: ['dangerous'],
      }),
    );
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: number };

    // a second map in the same group shares the level, region, and synced meta
    const survivor = await groupMapPutRequest(
      'owner-1',
      groupMapBody({
        mapGroupId: groupId,
        geoguessrId: 'survivor-map',
        levels: [levelId],
        regions: [regionId],
        includeFilters: ['ca'],
      }),
    );
    expect(survivor.status).toBe(200);
    const { id: survivorId } = (await survivor.json()) as { id: number };

    // synced meta associations are not settable through the PUT route: seed directly
    const [syncedMeta] = await db
      .insert(syncedMetas)
      .values({
        metaId: 7001,
        mapGroupId: groupId,
        name: 'Synced meta',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      })
      .returning({ metaId: syncedMetas.metaId });
    await db.insert(syncedMapMetas).values([
      { mapId: id, syncedMetaId: syncedMeta!.metaId },
      { mapId: survivorId, syncedMetaId: syncedMeta!.metaId },
    ]);

    const response = await groupMapDeleteRequest('owner-1', id);
    expect(response.status).toBe(200);

    // the deleted map row is gone and every association row followed via cascade
    expect(await db.select().from(maps).where(eq(maps.id, id))).toEqual([]);
    expect(
      await db.select().from(mapLevels).where(eq(mapLevels.mapId, id)),
    ).toEqual([]);
    expect(
      await db.select().from(mapFilters).where(eq(mapFilters.mapId, id)),
    ).toEqual([]);
    expect(
      await db.select().from(mapRegions).where(eq(mapRegions.mapId, id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(syncedMapMetas)
        .where(eq(syncedMapMetas.mapId, id)),
    ).toEqual([]);

    // the unrelated map keeps its row and every shared association
    expect(
      await db.select().from(maps).where(eq(maps.id, survivorId)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ levelId: mapLevels.levelId })
        .from(mapLevels)
        .where(eq(mapLevels.mapId, survivorId)),
    ).toEqual([{ levelId }]);
    expect(
      await db
        .select({ tagLike: mapFilters.tagLike })
        .from(mapFilters)
        .where(eq(mapFilters.mapId, survivorId)),
    ).toEqual([{ tagLike: 'ca' }]);
    expect(
      await db
        .select({ regionId: mapRegions.regionId })
        .from(mapRegions)
        .where(eq(mapRegions.mapId, survivorId)),
    ).toEqual([{ regionId }]);
    expect(
      await db
        .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
        .from(syncedMapMetas)
        .where(eq(syncedMapMetas.mapId, survivorId)),
    ).toEqual([{ syncedMetaId: syncedMeta!.metaId }]);

    // master rows referenced by the deleted map survive: only join rows cascade
    expect(
      await db.select().from(levels).where(eq(levels.id, levelId)),
    ).toHaveLength(1);
    expect(
      await db.select().from(regions).where(eq(regions.id, regionId)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(syncedMetas)
        .where(eq(syncedMetas.metaId, syncedMeta!.metaId)),
    ).toHaveLength(1);

    // exactly one delete log entry, owned by the caller, for the deleted map
    expect(
      await db
        .select()
        .from(mapGroupChanges)
        .where(
          and(
            eq(mapGroupChanges.entityType, 'map'),
            eq(mapGroupChanges.entityId, id),
            eq(mapGroupChanges.operation, 'delete'),
          ),
        ),
    ).toEqual([
      expect.objectContaining({
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'map',
        entityId: id,
        entityLabel: 'Map Name',
        operation: 'delete',
        oldValue: expect.objectContaining({
          name: 'Map Name',
          geoguessrId: 'doomed-map',
        }),
      }),
    ]);
  });

  test('editor and unrelated callers are denied with row and associations unchanged', async () => {
    await seedUser('owner-1');
    await seedUser('editor-1');
    await seedUser('outsider-1');
    const groupId = await seedGroup('Test group');
    await seedGroupOwner('owner-1', groupId);
    await db.insert(mapGroupPermissions).values({
      mapGroupId: groupId,
      userId: 'editor-1',
      role: 'editor',
    });
    const levelId = await seedLevel(groupId, 'Beginner');
    const regionId = await seedRegion('Europe');

    const created = await groupMapPutRequest(
      'owner-1',
      groupMapBody({
        mapGroupId: groupId,
        geoguessrId: 'protected-map',
        levels: [levelId],
        regions: [regionId],
        includeFilters: ['us'],
      }),
    );
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const [syncedMeta] = await db
      .insert(syncedMetas)
      .values({
        metaId: 7001,
        mapGroupId: groupId,
        name: 'Synced meta',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      })
      .returning({ metaId: syncedMetas.metaId });
    await db
      .insert(syncedMapMetas)
      .values([{ mapId: id, syncedMetaId: syncedMeta!.metaId }]);

    // editor owns the group as editor, outsider has no relation to it
    expect((await groupMapDeleteRequest('editor-1', id)).status).toBe(403);
    expect((await groupMapDeleteRequest('outsider-1', id)).status).toBe(403);

    // the map row and every association survive both denied attempts
    expect(await db.select().from(maps).where(eq(maps.id, id))).toHaveLength(1);
    expect(
      await db
        .select({ levelId: mapLevels.levelId })
        .from(mapLevels)
        .where(eq(mapLevels.mapId, id)),
    ).toEqual([{ levelId }]);
    expect(
      await db
        .select({ tagLike: mapFilters.tagLike })
        .from(mapFilters)
        .where(eq(mapFilters.mapId, id)),
    ).toEqual([{ tagLike: 'us' }]);
    expect(
      await db
        .select({ regionId: mapRegions.regionId })
        .from(mapRegions)
        .where(eq(mapRegions.mapId, id)),
    ).toEqual([{ regionId }]);
    expect(
      await db
        .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
        .from(syncedMapMetas)
        .where(eq(syncedMapMetas.mapId, id)),
    ).toEqual([{ syncedMetaId: syncedMeta!.metaId }]);

    // no delete log leaked from the denied attempts
    expect(
      await db
        .select()
        .from(mapGroupChanges)
        .where(
          and(
            eq(mapGroupChanges.entityType, 'map'),
            eq(mapGroupChanges.entityId, id),
            eq(mapGroupChanges.operation, 'delete'),
          ),
        ),
    ).toEqual([]);
  });
});

describe('GET /api/internal/maps/group/:id/download', () => {
  beforeEach(() => {
    // fail closed: this read-only route must never reach an external boundary
    process.env.NFCA_TOKEN = 'test-token';
    geoguessrFetches = [];
    geoguessrMapResults = {};
    mockFetchFailClosed();
  });

  afterEach(() => {
    restoreFetch();
    restoreNfcaToken();
  });

  // minimal group/meta/map/location fixture visible through the mapLocations view
  async function seedDownloadFixture() {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Download group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    const [meta] = await db
      .insert(metas)
      .values({
        mapGroupId: groupId,
        tagName: 'alpha',
        name: 'Alpha meta',
        note: 'Meta note',
      })
      .returning({ id: metas.id });

    const [map] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Download Map',
        geoguessrId: 'download-map',
        isPersonal: false,
      })
      .returning({ id: maps.id });

    const locations = await db
      .insert(mapGroupLocations)
      .values([
        {
          mapGroupId: groupId,
          extraTag: 'alpha',
          panoId: 'pano-a',
          lat: 1,
          lng: 2,
          heading: 3,
          pitch: 4,
          zoom: 5,
          extraPanoId: 'extra-a',
          extraPanoDate: '2020-01-01',
        },
        {
          mapGroupId: groupId,
          extraTag: 'alpha',
          panoId: 'pano-b',
          lat: 1.5,
          lng: 2.5,
          heading: 3.5,
          pitch: 4.5,
          zoom: 5.5,
          extraPanoId: null,
          extraPanoDate: null,
        },
      ])
      .returning({ id: mapGroupLocations.id });
    await db.insert(mapGroupLocationMetas).values(
      locations.map((location) => ({
        locationId: location.id,
        metaId: meta!.id,
        mapGroupId: groupId,
      })),
    );

    return { groupId, mapId: map!.id };
  }

  test('owner and editor download the exact public JSON and omit internal view fields', async () => {
    await seedUser('owner-1');
    await seedUser('editor-1');
    const { groupId, mapId } = await seedDownloadFixture();
    await seedGroupOwner('owner-1', groupId);
    await db.insert(mapGroupPermissions).values({
      mapGroupId: groupId,
      userId: 'editor-1',
      role: 'editor',
    });

    for (const userId of ['owner-1', 'editor-1']) {
      const response = await groupMapDownloadRequest(userId, mapId, groupId);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(
        /^application\/json/,
      );
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="Download Map.json"',
      );

      const body = (await response.json()) as {
        name: string;
        customCoordinates: Array<{
          lat: number;
          lng: number;
          heading: number;
          pitch: number;
          zoom: number;
          panoId: string;
          countryCode: null;
          stateCode: null;
          extra: {
            tags: string[];
            panoDate: string | null;
            panoId: string | null;
          };
        }>;
        extra: { tags: Record<string, never>; infoCoordinates: never[] };
      };
      body.customCoordinates.sort((a, b) => a.panoId.localeCompare(b.panoId));
      expect(body).toEqual({
        name: 'Download Map',
        customCoordinates: [
          {
            lat: 1,
            lng: 2,
            heading: 3,
            pitch: 4,
            zoom: 5,
            panoId: 'pano-a',
            countryCode: null,
            stateCode: null,
            extra: {
              // the group-map export intentionally leaves tags empty
              tags: [],
              panoDate: '2020-01-01',
              panoId: 'extra-a',
            },
          },
          {
            lat: 1.5,
            lng: 2.5,
            heading: 3.5,
            pitch: 4.5,
            zoom: 5.5,
            panoId: 'pano-b',
            countryCode: null,
            stateCode: null,
            extra: {
              tags: [],
              panoDate: null,
              panoId: null,
            },
          },
        ],
        extra: {
          tags: {},
          infoCoordinates: [],
        },
      });
    }

    // the view exposes internal columns for every downloaded location; none leak
    const viewRows = await db
      .select()
      .from(mapLocations)
      .where(eq(mapLocations.mapId, mapId));
    expect(viewRows).toHaveLength(2);
    for (const row of viewRows) {
      expect(row).toEqual(
        expect.objectContaining({
          mapId,
          tagName: 'alpha',
          metaName: 'Alpha meta',
          metaNote: 'Meta note',
          metaNoteFromPlonkit: false,
        }),
      );
    }
  });

  test('unrelated caller is denied without leaking the map or its locations', async () => {
    await seedUser('outsider-1');
    const { groupId, mapId } = await seedDownloadFixture();

    const response = await groupMapDownloadRequest(
      'outsider-1',
      mapId,
      groupId,
    );

    expect(response.status).toBe(403);
  });

  test('map id with a mismatched group id is 404 even for a member of the real group', async () => {
    await seedUser('owner-1');
    const { groupId, mapId } = await seedDownloadFixture();
    await seedGroupOwner('owner-1', groupId);
    const [otherGroup] = await db
      .insert(mapGroups)
      .values({ name: 'Other group' })
      .returning({ id: mapGroups.id });

    const response = await groupMapDownloadRequest(
      'owner-1',
      mapId,
      otherGroup!.id,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Map not found' });
  });
});

describe('GET /api/internal/maps/group/:id/meta-balance', () => {
  test('counts exclusive and shared relationships without duplicating locations', async () => {
    await seedUser('balance-owner');
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Balance group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;
    await seedGroupOwner('balance-owner', groupId);
    const [map] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Balance Map',
        geoguessrId: 'balance-map',
      })
      .returning({ id: maps.id });
    const insertedMetas = await db
      .insert(metas)
      .values([
        { mapGroupId: groupId, tagName: 'a', name: 'A', note: '' },
        { mapGroupId: groupId, tagName: 'b', name: 'B', note: '' },
      ])
      .returning({ id: metas.id, tagName: metas.tagName });
    const metaByTag = new Map(
      insertedMetas.map((meta) => [meta.tagName, meta.id]),
    );
    const locations = await db
      .insert(mapGroupLocations)
      .values([
        {
          mapGroupId: groupId,
          panoId: 'shared',
          extraTag: 'a',
          lat: 1,
          lng: 2,
          heading: 3,
          pitch: 4,
          zoom: 5,
        },
        {
          mapGroupId: groupId,
          panoId: 'exclusive-a',
          extraTag: 'a',
          lat: 6,
          lng: 7,
          heading: 8,
          pitch: 9,
          zoom: 10,
        },
      ])
      .returning({
        id: mapGroupLocations.id,
        panoId: mapGroupLocations.panoId,
      });
    const locationByPano = new Map(
      locations.map((location) => [location.panoId, location.id]),
    );
    await db.insert(mapGroupLocationMetas).values([
      {
        locationId: locationByPano.get('shared')!,
        metaId: metaByTag.get('a')!,
        mapGroupId: groupId,
      },
      {
        locationId: locationByPano.get('shared')!,
        metaId: metaByTag.get('b')!,
        mapGroupId: groupId,
      },
      {
        locationId: locationByPano.get('exclusive-a')!,
        metaId: metaByTag.get('a')!,
        mapGroupId: groupId,
      },
    ]);

    const response = await groupMapBalanceRequest(
      'balance-owner',
      map!.id,
      groupId,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mapName: 'Balance Map',
      totalLocations: 2,
      metas: [
        {
          id: metaByTag.get('a'),
          name: 'A',
          tagName: 'a',
          links: 2,
          exclusive: 1,
          shared: 1,
          share: 1,
        },
        {
          id: metaByTag.get('b'),
          name: 'B',
          tagName: 'b',
          links: 1,
          exclusive: 0,
          shared: 1,
          share: 0.5,
        },
      ],
    });
  });
});
