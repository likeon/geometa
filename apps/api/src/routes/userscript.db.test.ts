import { describe, expect, test } from 'bun:test';
import { app } from '../api';
import {
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
  users,
} from '../lib/db/schema';
import { db } from '../lib/drizzle';
import { plonkitFooter } from '../lib/userscript/constants';
import { fingerprintMapCoordinates } from '../lib/userscript/map-fingerprint';
import { normalizeGeoJson, type MetaGeoJson } from '../lib/utils/geojson';

const mapArea = normalizeGeoJson({
  type: 'Polygon',
  coordinates: [
    [
      [10, 20],
      [11, 20],
      [11, 21],
      [10, 20],
    ],
  ],
});

async function requestLocation(mapId: string, panoId: string) {
  return app.handle(
    new Request(
      `http://localhost/api/userscript/location/?mapId=${mapId}&panoId=${panoId}`,
    ),
  );
}

async function requestLocationsExport(
  geoguessrId: string,
  token?: string,
  expectedFingerprint?: string,
) {
  const query = expectedFingerprint
    ? `?expectedFingerprint=${expectedFingerprint}`
    : '';
  return app.handle(
    new Request(
      `http://localhost/api/userscript/map/${geoguessrId}/locations${query}`,
      {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      },
    ),
  );
}

async function requestGroupManifest(groupId: number, token?: string) {
  return app.handle(
    new Request(`http://localhost/api/userscript/map-group/${groupId}/maps`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    }),
  );
}

async function requestAccessibleGroups(token?: string) {
  return app.handle(
    new Request('http://localhost/api/userscript/map-groups', {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    }),
  );
}

interface SeedExportMapOptions {
  isPersonal?: boolean;
  userId?: string | null;
}

async function seedExportMap(
  geoguessrId: string,
  options: SeedExportMapOptions = {},
) {
  const { isPersonal = false, userId = null } = options;

  let mapGroupId: number | null = null;
  if (!isPersonal) {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Export Group' })
      .returning({ id: mapGroups.id });
    mapGroupId = group!.id;
  }

  const [map] = await db
    .insert(maps)
    .values({
      name: 'Export Map',
      geoguessrId,
      mapGroupId,
      isPersonal,
      userId,
    })
    .returning({ id: maps.id });

  return { mapId: map!.id, mapGroupId };
}

interface SeedLocationInput {
  geoguessrId: string;
  panoId: string;
  syncedMetaId: number;
  country?: string | null;
  isPersonal?: boolean;
  metaName?: string;
  note?: string;
  metaFooter?: string;
  noteFromPlonkit?: boolean;
  images?: string[];
  geoJson?: MetaGeoJson;
  mapFooterHtml?: string;
  authors?: string;
  numberOfGamesPlayed?: number | null;
}

async function seedLocation({
  geoguessrId,
  panoId,
  syncedMetaId,
  country,
  isPersonal = false,
  metaName = 'Test Meta',
  note = 'Test note',
  metaFooter = 'Meta footer',
  noteFromPlonkit = false,
  images = ['img.jpg'],
  geoJson,
  mapFooterHtml = '<p>Map footer</p>',
  authors = 'Map Author',
  numberOfGamesPlayed = null,
}: SeedLocationInput) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Test Group' })
    .returning({ id: mapGroups.id });

  const [map] = await db
    .insert(maps)
    .values({
      name: 'Test Map',
      geoguessrId,
      mapGroupId: isPersonal ? null : group!.id,
      isPersonal,
      authors,
      footerHtml: mapFooterHtml,
      numberOfGamesPlayed,
    })
    .returning({ id: maps.id });

  await db.insert(syncedMetas).values({
    metaId: syncedMetaId,
    mapGroupId: group!.id,
    name: metaName,
    note,
    noteFromPlonkit,
    footer: metaFooter,
    images,
    geoJson,
  });

  await db.insert(syncedMapMetas).values({
    mapId: map!.id,
    syncedMetaId,
  });

  await db.insert(syncedLocations).values({
    syncedMetaId,
    panoId,
    country: country === undefined ? 'Czechia' : country,
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    extraTag: 'tag',
  });

  return map!.id;
}

interface SeedExportLocationsInput {
  mapId: number;
  panoIds: string[];
  syncedMetaId?: number;
}

async function seedExportLocations({
  mapId,
  panoIds,
  syncedMetaId = 9001,
}: SeedExportLocationsInput) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Export Locations Group' })
    .returning({ id: mapGroups.id });

  await db.insert(syncedMetas).values({
    metaId: syncedMetaId,
    mapGroupId: group!.id,
    name: 'Export Meta',
    note: 'Export note',
    noteFromPlonkit: false,
    footer: 'Export footer',
    images: [],
  });

  await db.insert(syncedMapMetas).values({
    mapId,
    syncedMetaId,
  });

  await db.insert(syncedLocations).values(
    panoIds.map((panoId) => ({
      syncedMetaId,
      panoId,
      // internal fields that must never leak into the export response
      country: 'Czechia',
      lat: 1,
      lng: 2,
      heading: 3,
      pitch: 4,
      zoom: 5,
      extraTag: 'internal-tag',
      extraPanoId: 'internal-pano',
      extraPanoDate: 'internal-date',
    })),
  );
}

describe('GET /api/userscript/location/', () => {
  describe('missing and unsynced locations', () => {
    test('unknown pano returns 404 with NOT_FOUND sentinel', async () => {
      await seedLocation({
        geoguessrId: 'map-a',
        panoId: 'pano-known',
        syncedMetaId: 1001,
      });

      const response = await requestLocation('map-a', 'pano-unknown');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(['NOT_FOUND']);
    });

    test('pano present only in the draft upload table is invisible and returns 404', async () => {
      const [group] = await db
        .insert(mapGroups)
        .values({ name: 'Draft Group' })
        .returning({ id: mapGroups.id });
      const [map] = await db
        .insert(maps)
        .values({
          name: 'Not Yet Synced Map',
          geoguessrId: 'map-draft',
          mapGroupId: group!.id,
        })
        .returning({ id: maps.id });

      // location uploaded but the map was never synced to the userscript tables
      await db.insert(mapGroupLocations).values({
        mapGroupId: group!.id,
        panoId: 'pano-draft-only',
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        extraTag: 'tag',
      });
      await db.insert(syncedMetas).values({
        metaId: 2002,
        mapGroupId: group!.id,
        name: 'Draft Meta',
        note: 'Draft note',
        noteFromPlonkit: false,
        footer: '',
        images: [],
      });
      await db.insert(syncedMapMetas).values({
        mapId: map!.id,
        syncedMetaId: 2002,
      });

      const response = await requestLocation('map-draft', 'pano-draft-only');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(['NOT_FOUND']);
    });
  });

  describe('found responses', () => {
    test('returns public fields and turns a null country into an empty string', async () => {
      await seedLocation({
        geoguessrId: 'map-a',
        panoId: 'pano-null-country',
        syncedMetaId: 1001,
        country: null,
        metaFooter: '',
        mapFooterHtml: '',
        geoJson: mapArea,
      });

      const response = await requestLocation('map-a', 'pano-null-country');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        country: '',
        metaName: 'Test Meta',
        note: 'Test note',
        images: ['img.jpg'],
        geoJson: mapArea,
        // no meta or map footer and no country: generic plonkit footer
        footer: plonkitFooter,
      });
    });

    test('appends original-map attribution for a personal map', async () => {
      const [group] = await db
        .insert(mapGroups)
        .values({ name: 'Attribution Group' })
        .returning({ id: mapGroups.id });

      const [personalMap] = await db
        .insert(maps)
        .values({
          name: 'Personal Map',
          geoguessrId: 'map-personal',
          mapGroupId: null,
          isPersonal: true,
          authors: 'Personal Author',
          footerHtml: '<p>Personal footer</p>',
        })
        .returning({ id: maps.id });

      const [originalMap] = await db
        .insert(maps)
        .values({
          name: 'Original Map',
          geoguessrId: 'map-original',
          mapGroupId: group!.id,
          isPersonal: false,
          authors: 'Original Author',
          footerHtml: '<p>Original footer</p>',
          numberOfGamesPlayed: 100,
        })
        .returning({ id: maps.id });

      await db.insert(syncedMetas).values({
        metaId: 3003,
        mapGroupId: group!.id,
        name: 'Shared Meta',
        note: 'Shared note',
        noteFromPlonkit: false,
        footer: 'Shared meta footer',
        images: ['shared.jpg'],
      });

      await db.insert(syncedMapMetas).values([
        { mapId: personalMap!.id, syncedMetaId: 3003 },
        { mapId: originalMap!.id, syncedMetaId: 3003 },
      ]);

      await db.insert(syncedLocations).values({
        syncedMetaId: 3003,
        panoId: 'pano-personal',
        country: 'Italy',
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        extraTag: 'tag',
      });

      const response = await requestLocation('map-personal', 'pano-personal');
      const body = (await response.json()) as {
        country: string;
        footer: string;
      };

      expect(response.status).toBe(200);
      expect(body.country).toBe('Italy');
      expect(body.footer).toBe(
        'Shared meta footer' +
          '<p>Meta taken from <a href="https://learnablemeta.com/maps/map-original" rel ="nofollow" target="_blank"> Original Map </a> by <b>Original Author</b></p>',
      );
    });
  });
});

describe('GET /api/userscript/map/:geoguessrId/locations authorization', () => {
  test('returns 401 when no bearer token is sent', async () => {
    await db.insert(users).values({ id: 'owner', username: 'owner' });
    await seedExportMap('export-map', { isPersonal: true, userId: 'owner' });

    const response = await requestLocationsExport('export-map');

    expect(response.status).toBe(401);
  });

  test('returns 403 for a token that matches no user', async () => {
    await seedExportMap('export-map');

    const response = await requestLocationsExport('export-map', 'ghost-token');

    expect(response.status).toBe(403);
  });

  test('returns 200 for the personal map owner', async () => {
    await db
      .insert(users)
      .values({ id: 'owner', username: 'owner', apiToken: 'owner-token' });
    await seedExportMap('export-map', { isPersonal: true, userId: 'owner' });

    const response = await requestLocationsExport('export-map', 'owner-token');

    expect(response.status).toBe(200);
    expect((await response.json()) as { customCoordinates: unknown[] }).toEqual(
      { customCoordinates: [] },
    );
  });

  test('returns 403 for a personal map when the token belongs to another user', async () => {
    await db
      .insert(users)
      .values({ id: 'owner', username: 'owner', apiToken: 'owner-token' });
    await db.insert(users).values({
      id: 'stranger',
      username: 'stranger',
      apiToken: 'stranger-token',
    });
    await seedExportMap('export-map', { isPersonal: true, userId: 'owner' });

    const response = await requestLocationsExport(
      'export-map',
      'stranger-token',
    );

    expect(response.status).toBe(403);
  });

  test('returns 200 for a group map owner', async () => {
    await db.insert(users).values({
      id: 'group-owner',
      username: 'group-owner',
      apiToken: 'group-owner-token',
    });
    const { mapGroupId } = await seedExportMap('export-map');
    await db.insert(mapGroupPermissions).values({
      mapGroupId: mapGroupId!,
      userId: 'group-owner',
      role: 'owner',
    });

    const response = await requestLocationsExport(
      'export-map',
      'group-owner-token',
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as { customCoordinates: unknown[] }).toEqual(
      { customCoordinates: [] },
    );
  });

  test('returns 200 for a group map editor', async () => {
    await db.insert(users).values({
      id: 'group-editor',
      username: 'group-editor',
      apiToken: 'group-editor-token',
    });
    const { mapGroupId } = await seedExportMap('export-map');
    await db.insert(mapGroupPermissions).values({
      mapGroupId: mapGroupId!,
      userId: 'group-editor',
      role: 'editor',
    });

    const response = await requestLocationsExport(
      'export-map',
      'group-editor-token',
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as { customCoordinates: unknown[] }).toEqual(
      { customCoordinates: [] },
    );
  });
});

describe('GET /api/userscript/map/:geoguessrId/locations response shape', () => {
  test('populated map exports the exact GeoGuessr shape and omits internal location fields', async () => {
    await db.insert(users).values({
      id: 'shape-owner',
      username: 'shape-owner',
      apiToken: 'shape-owner-token',
    });
    const { mapId } = await seedExportMap('shape-map', {
      isPersonal: true,
      userId: 'shape-owner',
    });
    await seedExportLocations({ mapId, panoIds: ['pano-b', 'pano-a'] });

    const response = await requestLocationsExport(
      'shape-map',
      'shape-owner-token',
    );
    const body = (await response.json()) as {
      customCoordinates: {
        lat: number;
        lng: number;
        heading: number;
        pitch: number;
        zoom: number;
        panoId: string;
        countryCode: null;
        stateCode: null;
      }[];
    };

    expect(response.status).toBe(200);
    expect(
      body.customCoordinates.sort((a, b) => a.panoId.localeCompare(b.panoId)),
    ).toEqual([
      {
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-a',
        countryCode: null,
        stateCode: null,
      },
      {
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-b',
        countryCode: null,
        stateCode: null,
      },
    ]);
  });

  test('accepts a matching fingerprint and rejects a stale fingerprint', async () => {
    await db.insert(users).values({
      id: 'fingerprint-owner',
      username: 'fingerprint-owner',
      apiToken: 'fingerprint-owner-token',
    });
    const { mapId } = await seedExportMap('fingerprint-map', {
      isPersonal: true,
      userId: 'fingerprint-owner',
    });
    await seedExportLocations({ mapId, panoIds: ['pano-a'] });
    const fingerprint = fingerprintMapCoordinates([
      { panoId: 'pano-a', lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5 },
    ]);

    const matching = await requestLocationsExport(
      'fingerprint-map',
      'fingerprint-owner-token',
      fingerprint,
    );
    const stale = await requestLocationsExport(
      'fingerprint-map',
      'fingerprint-owner-token',
      '0'.repeat(64),
    );

    expect(matching.status).toBe(200);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({
      message: 'Synchronized map data changed; scan the group again',
    });
  });
});

describe('GET /api/userscript/map-group/:groupId/maps', () => {
  async function seedManifestGroup() {
    await db.insert(users).values([
      { id: 'manifest-owner', username: 'owner', apiToken: 'manifest-token' },
      {
        id: 'manifest-stranger',
        username: 'stranger',
        apiToken: 'stranger-token',
      },
    ]);
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Manifest Group', syncedAt: 1_700_000_000 })
      .returning({ id: mapGroups.id });
    await db.insert(mapGroupPermissions).values({
      mapGroupId: group!.id,
      userId: 'manifest-owner',
      role: 'owner',
    });
    const insertedMaps = await db
      .insert(maps)
      .values([
        {
          name: 'Populated Map',
          geoguessrId: 'manifest-populated',
          mapGroupId: group!.id,
        },
        {
          name: 'Empty Map',
          geoguessrId: 'manifest-empty',
          mapGroupId: group!.id,
        },
      ])
      .returning({ id: maps.id, geoguessrId: maps.geoguessrId });
    const populated = insertedMaps.find(
      (map) => map.geoguessrId === 'manifest-populated',
    )!;
    await seedExportLocations({
      mapId: populated.id,
      panoIds: ['pano-b', 'pano-a'],
      syncedMetaId: 9100,
    });
    return group!.id;
  }

  test('requires a valid token and group permission', async () => {
    const groupId = await seedManifestGroup();

    expect((await requestGroupManifest(groupId)).status).toBe(401);
    expect((await requestGroupManifest(groupId, 'unknown-token')).status).toBe(
      401,
    );
    expect((await requestGroupManifest(groupId, 'stranger-token')).status).toBe(
      404,
    );
    expect(
      (await requestGroupManifest(groupId + 10_000, 'stranger-token')).status,
    ).toBe(404);
  });

  test('returns every group map with stable synchronized fingerprints', async () => {
    const groupId = await seedManifestGroup();
    const response = await requestGroupManifest(groupId, 'manifest-token');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      group: {
        id: groupId,
        name: 'Manifest Group',
        syncedAt: 1_700_000_000,
      },
      maps: [
        {
          name: 'Empty Map',
          geoguessrId: 'manifest-empty',
          locationCount: 0,
          fingerprint: fingerprintMapCoordinates([]),
        },
        {
          name: 'Populated Map',
          geoguessrId: 'manifest-populated',
          locationCount: 2,
          fingerprint: fingerprintMapCoordinates([
            { panoId: 'pano-a', lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5 },
            { panoId: 'pano-b', lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5 },
          ]),
        },
      ],
    });
  });

  test('rejects a group that has never been synchronized', async () => {
    await db.insert(users).values({
      id: 'unsynced-owner',
      username: 'owner',
      apiToken: 'unsynced-token',
    });
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Unsynced Group', syncedAt: null })
      .returning({ id: mapGroups.id });
    await db.insert(mapGroupPermissions).values({
      mapGroupId: group!.id,
      userId: 'unsynced-owner',
      role: 'owner',
    });

    const response = await requestGroupManifest(group!.id, 'unsynced-token');
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'Map group has not been synchronized',
    });
  });
});

describe('GET /api/userscript/map-groups', () => {
  test('requires a valid token', async () => {
    await db.insert(users).values({
      id: 'group-list-owner',
      username: 'group-list-owner',
      apiToken: 'group-list-token',
    });

    expect((await requestAccessibleGroups()).status).toBe(401);
    expect((await requestAccessibleGroups('unknown-token')).status).toBe(401);
  });

  test('returns only synchronized groups with maps that the user can access', async () => {
    await db.insert(users).values([
      {
        id: 'group-list-owner',
        username: 'group-list-owner',
        apiToken: 'group-list-token',
      },
      {
        id: 'group-list-stranger',
        username: 'group-list-stranger',
        apiToken: 'group-list-stranger-token',
      },
    ]);
    const insertedGroups = await db
      .insert(mapGroups)
      .values([
        { name: 'Available B', syncedAt: 1_700_000_002 },
        { name: 'Available A', syncedAt: 1_700_000_001 },
        { name: 'Unsynced', syncedAt: null },
        { name: 'Mapless', syncedAt: 1_700_000_003 },
        { name: 'Someone Else', syncedAt: 1_700_000_004 },
      ])
      .returning({ id: mapGroups.id, name: mapGroups.name });
    const byName = new Map(
      insertedGroups.map((group) => [group.name, group.id]),
    );

    await db.insert(mapGroupPermissions).values([
      {
        mapGroupId: byName.get('Available A')!,
        userId: 'group-list-owner',
        role: 'owner',
      },
      {
        mapGroupId: byName.get('Available B')!,
        userId: 'group-list-owner',
        role: 'editor',
      },
      {
        mapGroupId: byName.get('Unsynced')!,
        userId: 'group-list-owner',
        role: 'owner',
      },
      {
        mapGroupId: byName.get('Mapless')!,
        userId: 'group-list-owner',
        role: 'owner',
      },
      {
        mapGroupId: byName.get('Someone Else')!,
        userId: 'group-list-stranger',
        role: 'owner',
      },
    ]);
    await db.insert(maps).values([
      {
        mapGroupId: byName.get('Available A')!,
        name: 'Available A map 1',
        geoguessrId: 'group-list-a-1',
      },
      {
        mapGroupId: byName.get('Available A')!,
        name: 'Available A map 2',
        geoguessrId: 'group-list-a-2',
      },
      {
        mapGroupId: byName.get('Available B')!,
        name: 'Available B map',
        geoguessrId: 'group-list-b',
      },
      {
        mapGroupId: byName.get('Unsynced')!,
        name: 'Unsynced map',
        geoguessrId: 'group-list-unsynced',
      },
      {
        mapGroupId: byName.get('Someone Else')!,
        name: 'Someone else map',
        geoguessrId: 'group-list-other',
      },
    ]);

    const response = await requestAccessibleGroups('group-list-token');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      groups: [
        {
          id: byName.get('Available A'),
          name: 'Available A',
          syncedAt: 1_700_000_001,
          mapCount: 2,
        },
        {
          id: byName.get('Available B'),
          name: 'Available B',
          syncedAt: 1_700_000_002,
          mapCount: 1,
        },
      ],
    });
  });
});

describe('GET /api/userscript/map/:geoguessrId', () => {
  test('personal map returns mapFound true, isPersonal true, and stable userscript version', async () => {
    await db.insert(maps).values({
      name: 'Personal Map',
      geoguessrId: 'map-lookup-personal',
      isPersonal: true,
      mapGroupId: null,
    });

    const response = await app.handle(
      new Request('http://localhost/api/userscript/map/map-lookup-personal'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mapFound: true,
      isPersonal: true,
      userscriptVersion: '0.94',
    });
  });

  test('group map returns mapFound true and isPersonal false', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Lookup Group' })
      .returning({ id: mapGroups.id });
    await db.insert(maps).values({
      name: 'Group Map',
      geoguessrId: 'map-lookup-group',
      mapGroupId: group!.id,
      isPersonal: false,
    });

    const response = await app.handle(
      new Request('http://localhost/api/userscript/map/map-lookup-group'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mapFound: true,
      isPersonal: false,
      userscriptVersion: '0.94',
    });
  });

  test('missing map returns 404 with mapFound false and stable userscript version', async () => {
    // an unrelated map exists, so the 404 proves the lookup is by geoguessrId
    await db.insert(maps).values({
      name: 'Existing Map',
      geoguessrId: 'map-lookup-existing',
      isPersonal: true,
      mapGroupId: null,
    });

    const response = await app.handle(
      new Request('http://localhost/api/userscript/map/map-lookup-missing'),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      mapFound: false,
      userscriptVersion: '0.94',
    });
  });
});
