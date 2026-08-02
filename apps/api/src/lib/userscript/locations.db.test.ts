import { describe, expect, test } from 'bun:test';
import {
  mapGroups,
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '../db/schema';
import { db } from '../drizzle';
import { locationSelect } from './locations';

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

describe('userscript location lookup', () => {
  test('exact map+pano lookup returns the selected public fields', async () => {
    await seedTwoMaps();

    const [result] = await locationSelect.execute({
      mapId: 'map-a',
      panoId: 'pano-shared',
    });

    expect(result).toEqual({
      name: 'Alpha Meta',
      note: 'Alpha note',
      footer: 'Alpha footer',
      images: ['a1.jpg', 'a2.jpg'],
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

    const [alphaLookup] = await locationSelect.execute({
      mapId: 'map-a',
      panoId: 'pano-shared',
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

    const [betaLookup] = await locationSelect.execute({
      mapId: 'map-b',
      panoId: 'pano-shared',
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
      await locationSelect.execute({ mapId: 'map-a', panoId: 'pano-b-only' }),
    ).toEqual([]);
    expect(
      await locationSelect.execute({ mapId: 'map-b', panoId: 'pano-a-only' }),
    ).toEqual([]);
  });

  test('personal map selects highest-played nonpersonal original attribution with deterministic tie-break', async () => {
    const { tieFirstId, tieSecondId } = await seedPersonalMapAttribution();

    // highest-played nonpersonal map wins
    const [highest] = await locationSelect.execute({
      mapId: 'map-personal',
      panoId: 'pano-personal-shared',
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
    const [tie] = await locationSelect.execute({
      mapId: 'map-personal',
      panoId: 'pano-personal-tie',
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
});
