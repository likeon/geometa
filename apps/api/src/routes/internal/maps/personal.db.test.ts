import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  mapGroups,
  maps,
  syncedMapMetas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { popularMapMessage } from '@api/lib/internal/utils';
import { eq } from 'drizzle-orm';

const originalFetch = globalThis.fetch;
const originalNfcaToken = process.env.NFCA_TOKEN;

let geoguessrFetches: string[] = [];

function mockGeoguessrSearch(gamesPlayedByMap: Record<string, number>) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith('https://www.geoguessr.com/api/v3/search/map')) {
      const q = new URL(url).searchParams.get('q') ?? '';
      geoguessrFetches.push(q);
      const numberOfGamesPlayed = gamesPlayedByMap[q];
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

async function createPersonalMap({
  userId,
  name,
  geoguessrId,
}: {
  userId: string;
  name: string;
  geoguessrId: string;
}) {
  return app.handle(
    new Request('http://localhost/api/internal/maps/personal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify({ name, geoguessrId }),
    }),
  );
}

async function seedUser(id: string, isSuperadmin = false) {
  await db.insert(users).values({
    id,
    username: id,
    isSuperadmin,
  });
}

async function seedPersonalMap({
  userId,
  name,
  geoguessrId,
}: {
  userId: string;
  name: string;
  geoguessrId: string;
}) {
  const [map] = await db
    .insert(maps)
    .values({ userId, name, geoguessrId, isPersonal: true })
    .returning({ id: maps.id });
  return map!;
}

async function seedGroupMap({
  name,
  geoguessrId,
}: {
  name: string;
  geoguessrId: string;
}) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Test group' })
    .returning({ id: mapGroups.id });
  const [map] = await db
    .insert(maps)
    .values({ mapGroupId: group!.id, name, geoguessrId, isPersonal: false })
    .returning({ id: maps.id });
  return map!;
}

function personalMapRequest(
  mapId: number,
  userId: string,
  init: RequestInit = {},
) {
  return app.handle(
    new Request(`http://localhost/api/internal/maps/personal/${mapId}`, {
      ...init,
      headers: { 'x-api-user-id': userId, ...init.headers },
    }),
  );
}

function personalMapMetasRequest(
  mapId: number,
  userId: string,
  init: RequestInit = {},
) {
  return app.handle(
    new Request(`http://localhost/api/internal/maps/personal/${mapId}/metas`, {
      ...init,
      headers: { 'x-api-user-id': userId, ...init.headers },
    }),
  );
}

describe('POST /api/internal/maps/personal', () => {
  beforeEach(() => {
    // geoguessrAPIFetch throws before any network call without this token
    process.env.NFCA_TOKEN = 'test-token';
    geoguessrFetches = [];
  });

  afterEach(() => {
    restoreFetch();
    restoreNfcaToken();
  });

  describe('normal user', () => {
    beforeEach(async () => {
      await seedUser('user-1');
    });

    test('creates a personal map when the GeoGuessr ID is not popular', async () => {
      mockGeoguessrSearch({ 'my-map': 100 });

      const response = await createPersonalMap({
        userId: 'user-1',
        name: 'My Map',
        geoguessrId: 'my-map',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: expect.any(Number) });

      const [row] = await db
        .select()
        .from(maps)
        .where(eq(maps.userId, 'user-1'));
      expect(row).toEqual(
        expect.objectContaining({
          userId: 'user-1',
          name: 'My Map',
          geoguessrId: 'my-map',
          isPersonal: true,
          mapGroupId: null,
        }),
      );
      expect(geoguessrFetches).toEqual(['my-map']);
    });

    test('rejects a popular map with 403 and stores nothing', async () => {
      mockGeoguessrSearch({ famous: 50000 });

      const response = await createPersonalMap({
        userId: 'user-1',
        name: 'Famous Map',
        geoguessrId: 'famous',
      });

      expect(response.status).toBe(403);
      expect(await response.text()).toBe(popularMapMessage);
      expect(await db.select().from(maps)).toEqual([]);
    });

    test('returns 409 when the GeoGuessr ID is already taken', async () => {
      mockGeoguessrSearch({ 'my-map': 100 });

      const first = await createPersonalMap({
        userId: 'user-1',
        name: 'My Map',
        geoguessrId: 'my-map',
      });
      expect(first.status).toBe(200);

      const second = await createPersonalMap({
        userId: 'user-1',
        name: 'My Map Again',
        geoguessrId: 'my-map',
      });
      expect(second.status).toBe(409);
      expect(await second.text()).toBe(
        'Map with this GeoGuessr ID already exists.',
      );
      expect(await db.select().from(maps)).toHaveLength(1);
    });
  });

  describe('superadmin user', () => {
    beforeEach(async () => {
      await seedUser('admin-1', true);
    });

    test('bypasses the popularity check without calling the GeoGuessr API', async () => {
      mockGeoguessrSearch({ famous: 50000 });

      const response = await createPersonalMap({
        userId: 'admin-1',
        name: 'Famous Map',
        geoguessrId: 'famous',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: expect.any(Number) });
      expect(geoguessrFetches).toEqual([]);

      const [row] = await db
        .select()
        .from(maps)
        .where(eq(maps.userId, 'admin-1'));
      expect(row).toEqual(
        expect.objectContaining({
          userId: 'admin-1',
          geoguessrId: 'famous',
          isPersonal: true,
        }),
      );
    });
  });
});

describe('GET /api/internal/maps/personal/:id', () => {
  test('owner can read their personal map', async () => {
    await seedUser('user-1');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      geoguessrId: 'my-map',
      name: 'My Map',
      metas: [],
    });
  });

  test('unrelated user cannot read another user personal map', async () => {
    await seedUser('user-1');
    await seedUser('user-2');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-2');

    expect(response.status).toBe(403);
  });

  test('rejects group maps', async () => {
    await seedUser('admin-1', true);
    const { id } = await seedGroupMap({
      name: 'Group Map',
      geoguessrId: 'group-map',
    });

    const response = await personalMapRequest(id, 'admin-1');

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/internal/maps/personal/:id', () => {
  beforeEach(() => {
    // geoguessrAPIFetch throws before any network call without this token
    process.env.NFCA_TOKEN = 'test-token';
    geoguessrFetches = [];
  });

  afterEach(() => {
    restoreFetch();
    restoreNfcaToken();
  });

  test('partial update preserves omitted fields', async () => {
    await seedUser('user-1');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id });
    const [row] = await db.select().from(maps).where(eq(maps.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        name: 'Renamed',
        geoguessrId: 'my-map',
        isPersonal: true,
        userId: 'user-1',
      }),
    );
  });

  test('duplicate GeoGuessr ID conflict leaves the row unchanged', async () => {
    mockGeoguessrSearch({ 'my-map': 100 });
    await seedUser('user-1');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });
    const { id: otherId } = await seedPersonalMap({
      userId: 'user-1',
      name: 'Other Map',
      geoguessrId: 'other-map',
    });

    const response = await personalMapRequest(otherId, 'user-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', geoguessrId: 'my-map' }),
    });

    expect(response.status).toBe(409);
    expect(await response.text()).toBe(
      'Map with this GeoGuessr ID already exists.',
    );
    // The whole update rolled back: neither the name nor the geoguessrId changed.
    const [row] = await db.select().from(maps).where(eq(maps.id, otherId));
    expect(row).toEqual(
      expect.objectContaining({ name: 'Other Map', geoguessrId: 'other-map' }),
    );
    const [original] = await db.select().from(maps).where(eq(maps.id, id));
    expect(original).toEqual(
      expect.objectContaining({ name: 'My Map', geoguessrId: 'my-map' }),
    );
  });

  test('unrelated user cannot update another user personal map', async () => {
    await seedUser('user-1');
    await seedUser('user-2');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-2', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });

    expect(response.status).toBe(403);
    const [row] = await db.select().from(maps).where(eq(maps.id, id));
    expect(row).toEqual(expect.objectContaining({ name: 'My Map' }));
  });

  test('rejects group maps', async () => {
    await seedUser('admin-1', true);
    const { id } = await seedGroupMap({
      name: 'Group Map',
      geoguessrId: 'group-map',
    });

    const response = await personalMapRequest(id, 'admin-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });

    expect(response.status).toBe(404);
  });

  test.todo('superadmin can update any personal map through the personal route, matching ensureMapAccess', async () => {
    // PATCH adds an owner predicate after ensureMapAccess grants superadmin access.
    await seedUser('user-1');
    await seedUser('admin-1', true);
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'admin-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed by admin' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id });
    const [row] = await db.select().from(maps).where(eq(maps.id, id));
    expect(row).toEqual(
      expect.objectContaining({ name: 'Renamed by admin', userId: 'user-1' }),
    );
  });
});

describe('DELETE /api/internal/maps/personal/:id', () => {
  test('owner can delete their personal map', async () => {
    await seedUser('user-1');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    expect(await db.select().from(maps).where(eq(maps.id, id))).toEqual([]);
  });

  test('unrelated user cannot delete another user personal map', async () => {
    await seedUser('user-1');
    await seedUser('user-2');
    const { id } = await seedPersonalMap({
      userId: 'user-1',
      name: 'My Map',
      geoguessrId: 'my-map',
    });

    const response = await personalMapRequest(id, 'user-2', {
      method: 'DELETE',
    });

    expect(response.status).toBe(403);
    expect(await db.select().from(maps).where(eq(maps.id, id))).toHaveLength(1);
  });

  test('rejects group maps', async () => {
    await seedUser('user-1');
    const { id } = await seedGroupMap({
      name: 'Group Map',
      geoguessrId: 'group-map',
    });

    const response = await personalMapRequest(id, 'user-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(403);
    expect(await db.select().from(maps).where(eq(maps.id, id))).toHaveLength(1);
  });

  test.todo('rejects deleting a group map when the caller passes the ownership check', async () => {
    // Defect: the DELETE handler runs ensureMapAccess but then deletes by
    // map id without an isPersonal guard, so any map the caller can access
    // (e.g. a group map as superadmin, or a non-personal map with a userId)
    // is deleted by the personal-maps endpoint.
    await seedUser('admin-1', true);
    const { id } = await seedGroupMap({
      name: 'Group Map',
      geoguessrId: 'group-map',
    });

    const response = await personalMapRequest(id, 'admin-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    expect(await db.select().from(maps).where(eq(maps.id, id))).toHaveLength(1);
  });
});

describe('POST/DELETE /api/internal/maps/personal/:id/metas', () => {
  test('owner adds only metas synced from shared maps; removal stays scoped to the target personal map', async () => {
    await seedUser('owner-1');
    await seedUser('other-1');

    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Source group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    // Source metas: one synced from a shared map, one only from a nonshared map.
    const sharedMetaId = 7001;
    const nonsharedMetaId = 7002;
    await db.insert(syncedMetas).values([
      {
        metaId: sharedMetaId,
        mapGroupId: groupId,
        name: 'Shared meta',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      },
      {
        metaId: nonsharedMetaId,
        mapGroupId: groupId,
        name: 'Nonshared meta',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      },
    ]);

    const [sharedSourceMap] = await db
      .insert(maps)
      .values({
        name: 'Shared source map',
        geoguessrId: 'shared-source-map',
        mapGroupId: groupId,
        isShared: true,
        isPersonal: false,
      })
      .returning({ id: maps.id });
    const [nonsharedSourceMap] = await db
      .insert(maps)
      .values({
        name: 'Nonshared source map',
        geoguessrId: 'nonshared-source-map',
        mapGroupId: groupId,
        isShared: false,
        isPersonal: false,
      })
      .returning({ id: maps.id });

    await db.insert(syncedMapMetas).values([
      { mapId: sharedSourceMap!.id, syncedMetaId: sharedMetaId },
      { mapId: nonsharedSourceMap!.id, syncedMetaId: nonsharedMetaId },
    ]);

    const { id: targetMapId } = await seedPersonalMap({
      userId: 'owner-1',
      name: 'Target map',
      geoguessrId: 'target-map',
    });
    const { id: unrelatedMapId } = await seedPersonalMap({
      userId: 'other-1',
      name: 'Unrelated map',
      geoguessrId: 'unrelated-map',
    });
    // The unrelated map already uses the shared meta; removal must not touch it.
    await db.insert(syncedMapMetas).values({
      mapId: unrelatedMapId,
      syncedMetaId: sharedMetaId,
    });

    // POST: only the meta synced from a shared map may be added; the
    // nonshared-source meta and an unknown id must stay unassociated.
    const postResponse = await personalMapMetasRequest(targetMapId, 'owner-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        metaIds: [sharedMetaId, sharedMetaId, nonsharedMetaId, 9999],
      }),
    });
    expect(postResponse.status).toBe(200);
    expect(await postResponse.json()).toEqual({ success: true, inserted: 1 });

    const targetMetasAfterPost = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, targetMapId));
    expect(targetMetasAfterPost.map((row) => row.syncedMetaId)).toEqual([
      sharedMetaId,
    ]);

    // DELETE: scoped to the target map; the same meta stays on the unrelated
    // personal map and on the shared source map.
    const deleteResponse = await personalMapMetasRequest(
      targetMapId,
      'owner-1',
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metaIds: [sharedMetaId] }),
      },
    );
    expect(deleteResponse.status).toBe(200);

    const targetMetasAfterDelete = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, targetMapId));
    expect(targetMetasAfterDelete).toHaveLength(0);

    const unrelatedAfterDelete = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, unrelatedMapId));
    expect(unrelatedAfterDelete.map((row) => row.syncedMetaId)).toEqual([
      sharedMetaId,
    ]);
    const sharedSourceAfterDelete = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, sharedSourceMap!.id));
    expect(sharedSourceAfterDelete.map((row) => row.syncedMetaId)).toEqual([
      sharedMetaId,
    ]);
    const nonsharedSourceAfterDelete = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, nonsharedSourceMap!.id));
    expect(nonsharedSourceAfterDelete.map((row) => row.syncedMetaId)).toEqual([
      nonsharedMetaId,
    ]);
  });

  test.todo('superadmin cannot mutate group map meta associations through personal routes', async () => {
    // Defect: both the metas POST and DELETE handlers run ensureMapAccess
    // (which superadmins pass for any map) but then mutate syncedMapMetas by
    // map id without an isPersonal guard, so a group map is reachable through
    // the personal-maps endpoint. GET and PATCH reject group maps with 404.
    await seedUser('admin-1', true);
    const { id: groupMapId } = await seedGroupMap({
      name: 'Group Map',
      geoguessrId: 'group-map',
    });

    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Source group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    // Both metas are synced from a shared map, so the handlers would accept
    // them if the group-map route-type guard were missing.
    const sharedMetaId = 7101;
    const sharedMeta2Id = 7102;
    await db.insert(syncedMetas).values([
      {
        metaId: sharedMetaId,
        mapGroupId: groupId,
        name: 'Shared meta',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      },
      {
        metaId: sharedMeta2Id,
        mapGroupId: groupId,
        name: 'Shared meta 2',
        note: 'note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      },
    ]);
    const [sourceMap] = await db
      .insert(maps)
      .values({
        name: 'Shared source map',
        geoguessrId: 'shared-source-map',
        mapGroupId: groupId,
        isShared: true,
        isPersonal: false,
      })
      .returning({ id: maps.id });
    await db.insert(syncedMapMetas).values([
      { mapId: sourceMap!.id, syncedMetaId: sharedMetaId },
      { mapId: sourceMap!.id, syncedMetaId: sharedMeta2Id },
    ]);
    // Pre-existing association on the group map that DELETE must not remove.
    await db.insert(syncedMapMetas).values({
      mapId: groupMapId,
      syncedMetaId: sharedMetaId,
    });

    const postResponse = await personalMapMetasRequest(groupMapId, 'admin-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metaIds: [sharedMetaId, sharedMeta2Id] }),
    });
    expect(postResponse.status).toBe(404);

    const deleteResponse = await personalMapMetasRequest(
      groupMapId,
      'admin-1',
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metaIds: [sharedMetaId] }),
      },
    );
    expect(deleteResponse.status).toBe(404);

    // Association preservation: neither POST added metas nor DELETE removed any,
    // and the group map itself is untouched.
    const associations = await db
      .select({ syncedMetaId: syncedMapMetas.syncedMetaId })
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, groupMapId));
    expect(associations.map((row) => row.syncedMetaId)).toEqual([sharedMetaId]);
    expect(
      await db.select().from(maps).where(eq(maps.id, groupMapId)),
    ).toHaveLength(1);
  });
});
