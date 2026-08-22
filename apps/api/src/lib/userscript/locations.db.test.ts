import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import {
  mapGroups,
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '../db/schema';
import { db } from '../drizzle';
import {
  locationMetaDetailSelect,
  locationMetaSummariesSelect,
  mapLocationsExportSelect,
} from './locations';

async function seedTwoMaps() {
  const [groupA] = await db
    .insert(mapGroups)
    .values({ name: 'Group A' })
    .returning({ id: mapGroups.id });
  const [groupB] = await db
    .insert(mapGroups)
    .values({ name: 'Group B' })
    .returning({ id: mapGroups.id });

  const [mapA] = await db
    .insert(maps)
    .values({
      name: 'Alpha Map',
      geoguessrId: 'map-a',
      mapGroupId: groupA!.id,
      authors: 'Author A',
      footerHtml: '<p>Alpha footer html</p>',
    })
    .returning({ id: maps.id });
  const [mapB] = await db
    .insert(maps)
    .values({
      name: 'Beta Map',
      geoguessrId: 'map-b',
      mapGroupId: groupB!.id,
      authors: 'Author B',
      footerHtml: '<p>Beta footer html</p>',
    })
    .returning({ id: maps.id });

  await db.insert(syncedMetas).values([
    {
      metaId: 1001,
      mapGroupId: groupA!.id,
      name: 'Alpha Meta',
      note: 'Alpha note',
      noteFromPlonkit: false,
      footer: 'Alpha footer',
      images: ['a1.jpg', 'a2.jpg'],
    },
    {
      metaId: 2002,
      mapGroupId: groupB!.id,
      name: 'Beta Meta',
      note: 'Beta note',
      noteFromPlonkit: true,
      footer: 'Beta footer',
      images: ['b1.jpg'],
    },
  ]);

  await db.insert(syncedMapMetas).values([
    { mapId: mapA!.id, syncedMetaId: 1001 },
    { mapId: mapB!.id, syncedMetaId: 2002 },
  ]);

  const sharedPano = {
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
  };
  await db.insert(syncedLocations).values([
    {
      ...sharedPano,
      syncedMetaId: 1001,
      panoId: 'pano-shared',
      country: 'Czechia',
      extraTag: 'tag-a',
    },
    {
      ...sharedPano,
      syncedMetaId: 2002,
      panoId: 'pano-shared',
      country: 'France',
      extraTag: 'tag-b',
    },
    {
      ...sharedPano,
      syncedMetaId: 1001,
      panoId: 'pano-a-only',
      country: 'Germany',
      extraTag: 'tag-a',
    },
    {
      ...sharedPano,
      syncedMetaId: 2002,
      panoId: 'pano-b-only',
      country: 'Spain',
      extraTag: 'tag-b',
    },
  ]);

  return { mapAId: mapA!.id, mapBId: mapB!.id };
}

// personal map borrowing a meta from multiple nonpersonal maps: attribution
// must come from the most-played nonpersonal original, with deterministic
// tie-break (lower original map id) for equal play counts
async function seedPersonalMapAttribution() {
  const [personalMap] = await db
    .insert(maps)
    .values({
      name: 'Personal Map',
      geoguessrId: 'map-personal',
      isPersonal: true,
      mapGroupId: null,
      authors: 'Personal Author',
      footerHtml: '<p>Personal footer html</p>',
    })
    .returning({ id: maps.id });

  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Shared Group' })
    .returning({ id: mapGroups.id });

  async function insertNonpersonalMap(
    name: string,
    geoguessrId: string,
    numberOfGamesPlayed: number,
  ) {
    const [map] = await db
      .insert(maps)
      .values({
        name,
        geoguessrId,
        mapGroupId: group!.id,
        isPersonal: false,
        authors: `${name} Author`,
        footerHtml: `<p>${name} footer html</p>`,
        numberOfGamesPlayed,
      })
      .returning({ id: maps.id });
    return map!.id;
  }

  // insertion order fixes ids so the tie-break expectation is well-defined
  const lowPlayId = await insertNonpersonalMap('Low Play Map', 'map-low', 10);
  const highPlayId = await insertNonpersonalMap(
    'High Play Map',
    'map-high',
    1000,
  );
  const tieFirstId = await insertNonpersonalMap(
    'Tie First Map',
    'map-tie-first',
    500,
  );
  const tieSecondId = await insertNonpersonalMap(
    'Tie Second Map',
    'map-tie-second',
    500,
  );

  await db.insert(syncedMetas).values([
    {
      metaId: 3003,
      mapGroupId: group!.id,
      name: 'Shared Meta',
      note: 'Shared note',
      noteFromPlonkit: false,
      footer: 'Shared footer',
      images: ['shared.jpg'],
    },
    {
      metaId: 4004,
      mapGroupId: group!.id,
      name: 'Tie Meta',
      note: 'Tie note',
      noteFromPlonkit: false,
      footer: 'Tie footer',
      images: ['tie.jpg'],
    },
  ]);

  await db.insert(syncedMapMetas).values([
    // meta 3003 shared with a low-play and a high-play nonpersonal map
    { mapId: personalMap!.id, syncedMetaId: 3003 },
    { mapId: lowPlayId, syncedMetaId: 3003 },
    { mapId: highPlayId, syncedMetaId: 3003 },
    // meta 4004 shared with two nonpersonal maps of equal play count
    { mapId: personalMap!.id, syncedMetaId: 4004 },
    { mapId: tieFirstId, syncedMetaId: 4004 },
    { mapId: tieSecondId, syncedMetaId: 4004 },
  ]);

  const sharedPano = {
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
  };
  await db.insert(syncedLocations).values([
    {
      ...sharedPano,
      syncedMetaId: 3003,
      panoId: 'pano-personal-shared',
      country: 'Italy',
      extraTag: 'tag-shared',
    },
    {
      ...sharedPano,
      syncedMetaId: 4004,
      panoId: 'pano-personal-tie',
      country: 'Italy',
      extraTag: 'tag-tie',
    },
  ]);

  return { personalMapId: personalMap!.id, tieFirstId, tieSecondId };
}

// personal map borrowing a meta that no nonpersonal map includes: the lateral
// original lookup finds nothing, so attribution fields stay null and the
// personal map's own footer is used
async function seedPersonalMapWithoutOriginal() {
  const [personalMap] = await db
    .insert(maps)
    .values({
      name: 'Orphan Personal Map',
      geoguessrId: 'map-personal-orphan',
      isPersonal: true,
      mapGroupId: null,
      authors: 'Orphan Author',
      footerHtml: '<p>Orphan footer html</p>',
    })
    .returning({ id: maps.id });

  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Borrowed Group' })
    .returning({ id: mapGroups.id });

  await db.insert(syncedMetas).values({
    metaId: 5005,
    mapGroupId: group!.id,
    name: 'Borrowed Meta',
    note: 'Borrowed note',
    noteFromPlonkit: false,
    footer: 'Borrowed footer',
    images: ['borrowed.jpg'],
  });

  await db.insert(syncedMapMetas).values({
    mapId: personalMap!.id,
    syncedMetaId: 5005,
  });

  await db.insert(syncedLocations).values({
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    syncedMetaId: 5005,
    panoId: 'pano-orphan',
    country: 'Austria',
    extraTag: 'tag-orphan',
  });

  return { personalMapId: personalMap!.id };
}

describe('userscript location lookup', () => {
  test('returns lightweight meta summaries for the exact map and pano', async () => {
    await seedTwoMaps();

    expect(
      await locationMetaSummariesSelect.execute({
        mapId: 'map-a',
        panoId: 'pano-shared',
      }),
    ).toEqual([{ id: 1001, metaName: 'Alpha Meta' }]);
  });

  test('exact map+pano lookup returns the selected public fields', async () => {
    await seedTwoMaps();

    const [result] = await locationMetaDetailSelect.execute({
      mapId: 'map-a',
      panoId: 'pano-shared',
      metaId: 1001,
      includeGeoJson: true,
    });

    expect(result).toEqual({
      name: 'Alpha Meta',
      note: 'Alpha note',
      footer: 'Alpha footer',
      images: ['a1.jpg', 'a2.jpg'],
      geoJson: null,
      noteFromPlonkit: false,
      country: 'Czechia',
      isPersonalMap: false,
      mapFooter: '<p>Alpha footer html</p>',
      // original-map attribution only applies to personal maps, so these are null
      mapName: null,
      mapAuthors: null,
      mapGeoguessrId: null,
      mapId: expect.any(Number),
      syncedMetaId: 1001,
    });
  });

  test('same pano in another map/group does not leak across maps', async () => {
    const { mapAId, mapBId } = await seedTwoMaps();

    const [alphaLookup] = await locationMetaDetailSelect.execute({
      mapId: 'map-a',
      panoId: 'pano-shared',
      metaId: 1001,
      includeGeoJson: true,
    });
    expect(alphaLookup).toEqual(
      expect.objectContaining({
        name: 'Alpha Meta',
        note: 'Alpha note',
        country: 'Czechia',
        mapId: mapAId,
        syncedMetaId: 1001,
      }),
    );

    const [betaLookup] = await locationMetaDetailSelect.execute({
      mapId: 'map-b',
      panoId: 'pano-shared',
      metaId: 2002,
      includeGeoJson: true,
    });
    expect(betaLookup).toEqual(
      expect.objectContaining({
        name: 'Beta Meta',
        note: 'Beta note',
        country: 'France',
        noteFromPlonkit: true,
        mapId: mapBId,
        syncedMetaId: 2002,
      }),
    );

    // a pano that exists only in the other map is invisible under this map
    expect(
      await locationMetaDetailSelect.execute({
        mapId: 'map-a',
        panoId: 'pano-b-only',
        metaId: 2002,
        includeGeoJson: true,
      }),
    ).toEqual([]);
    expect(
      await locationMetaDetailSelect.execute({
        mapId: 'map-b',
        panoId: 'pano-a-only',
        metaId: 1001,
        includeGeoJson: true,
      }),
    ).toEqual([]);
  });

  test('personal map selects highest-played nonpersonal original attribution with deterministic tie-break', async () => {
    const { tieFirstId, tieSecondId } = await seedPersonalMapAttribution();

    // highest-played nonpersonal map wins
    const [highest] = await locationMetaDetailSelect.execute({
      mapId: 'map-personal',
      panoId: 'pano-personal-shared',
      metaId: 3003,
      includeGeoJson: true,
    });
    expect(highest).toEqual(
      expect.objectContaining({
        name: 'Shared Meta',
        isPersonalMap: true,
        mapName: 'High Play Map',
        mapAuthors: 'High Play Map Author',
        mapGeoguessrId: 'map-high',
        mapFooter: '<p>High Play Map footer html</p>',
      }),
    );

    // equal play counts resolve deterministically to the lower original id
    expect(tieFirstId).toBeLessThan(tieSecondId);
    const [tie] = await locationMetaDetailSelect.execute({
      mapId: 'map-personal',
      panoId: 'pano-personal-tie',
      metaId: 4004,
      includeGeoJson: true,
    });
    expect(tie).toEqual(
      expect.objectContaining({
        name: 'Tie Meta',
        isPersonalMap: true,
        mapName: 'Tie First Map',
        mapAuthors: 'Tie First Map Author',
        mapGeoguessrId: 'map-tie-first',
        mapFooter: '<p>Tie First Map footer html</p>',
      }),
    );
  });

  test('personal map without nonpersonal original uses own footer and null attribution', async () => {
    const { personalMapId } = await seedPersonalMapWithoutOriginal();

    const [result] = await locationMetaDetailSelect.execute({
      mapId: 'map-personal-orphan',
      panoId: 'pano-orphan',
      metaId: 5005,
      includeGeoJson: true,
    });

    expect(result).toEqual({
      name: 'Borrowed Meta',
      note: 'Borrowed note',
      footer: 'Borrowed footer',
      images: ['borrowed.jpg'],
      geoJson: null,
      noteFromPlonkit: false,
      country: 'Austria',
      isPersonalMap: true,
      // no eligible nonpersonal original: the personal map's own footer wins
      mapFooter: '<p>Orphan footer html</p>',
      mapName: null,
      mapAuthors: null,
      mapGeoguessrId: null,
      mapId: personalMapId,
      syncedMetaId: 5005,
    });
  });
});

describe('userscript map locations export', () => {
  test('includes only synced locations of the requested map and omits other maps', async () => {
    const { mapAId, mapBId } = await seedTwoMaps();

    const alphaLocations = await mapLocationsExportSelect.execute({
      mapId: mapAId,
    });
    // pano-shared also exists under map B's meta; only map A's own meta's
    // locations may come back, and pano-b-only must stay invisible
    expect(
      alphaLocations.sort((a, b) => a.panoId.localeCompare(b.panoId)),
    ).toEqual([
      { lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5, panoId: 'pano-a-only' },
      { lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5, panoId: 'pano-shared' },
    ]);

    const betaLocations = await mapLocationsExportSelect.execute({
      mapId: mapBId,
    });
    expect(
      betaLocations.sort((a, b) => a.panoId.localeCompare(b.panoId)),
    ).toEqual([
      { lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5, panoId: 'pano-b-only' },
      { lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5, panoId: 'pano-shared' },
    ]);
  });

  test('exports a pano shared by multiple metas only once', async () => {
    const { mapAId } = await seedTwoMaps();
    await db.insert(syncedMapMetas).values({
      mapId: mapAId,
      syncedMetaId: 2002,
    });
    await db
      .update(syncedLocations)
      .set({ lat: 99 })
      .where(
        and(
          eq(syncedLocations.syncedMetaId, 2002),
          eq(syncedLocations.panoId, 'pano-shared'),
        ),
      );

    const locations = await mapLocationsExportSelect.execute({ mapId: mapAId });
    expect(locations).toHaveLength(3);
    expect(
      locations.find((location) => location.panoId === 'pano-shared'),
    ).toEqual(expect.objectContaining({ lat: 1 }));
  });
});
