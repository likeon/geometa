import { beforeEach, describe, expect, test } from 'bun:test';
import { app } from '../api';
import { mapGroups, mapRegions, maps, regions } from '../lib/db/schema';
import { db } from '../lib/drizzle';

async function requestMaps(query = '') {
  const response = await app.handle(
    new Request(`http://localhost/api/maps/${query}`),
  );
  expect(response.status).toBe(200);
  return response.json();
}

async function seedMaps() {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Test group' })
    .returning({ id: mapGroups.id });
  const [europe, asia] = await db
    .insert(regions)
    .values([{ name: 'Europe' }, { name: 'Asia' }])
    .returning({ id: regions.id, name: regions.name });
  const insertedMaps = await db
    .insert(maps)
    .values([
      {
        mapGroupId: group!.id,
        name: 'Alpine Roads',
        geoguessrId: 'alpine',
        description: 'Mountain coverage',
        authors: 'Ada',
        isPublished: true,
        isShared: true,
        isVerified: true,
      },
      {
        mapGroupId: group!.id,
        name: 'Asian Cities',
        geoguessrId: 'cities',
        description: 'Urban challenge',
        authors: 'Lin',
        isPublished: true,
      },
      {
        mapGroupId: group!.id,
        name: 'Draft',
        geoguessrId: 'draft',
        isPublished: false,
      },
      {
        name: 'Personal',
        geoguessrId: 'personal',
        isPublished: true,
        isPersonal: true,
      },
    ])
    .returning({ id: maps.id, geoguessrId: maps.geoguessrId });
  const alpine = insertedMaps.find((map) => map.geoguessrId === 'alpine')!;
  const cities = insertedMaps.find((map) => map.geoguessrId === 'cities')!;

  await db.insert(mapRegions).values([
    { mapId: alpine.id, regionId: europe!.id },
    { mapId: cities.id, regionId: asia!.id },
  ]);
}

describe.serial('GET /api/maps/', () => {
  test('returns an empty list when no public maps exist', async () => {
    expect(await requestMaps()).toEqual([]);
  });

  describe('with maps', () => {
    beforeEach(seedMaps);

    test('returns only public non-personal maps with public response fields', async () => {
      expect(await requestMaps()).toEqual([
        {
          geoguessrId: 'alpine',
          name: 'Alpine Roads',
          description: 'Mountain coverage',
          authors: 'Ada',
          isShared: true,
          regions: ['Europe'],
        },
        {
          geoguessrId: 'cities',
          name: 'Asian Cities',
          description: 'Urban challenge',
          authors: 'Lin',
          isShared: false,
          regions: ['Asia'],
        },
      ]);
    });

    test('searches map names and descriptions', async () => {
      expect(await requestMaps('?q=alpine')).toEqual([
        expect.objectContaining({ geoguessrId: 'alpine' }),
      ]);
      expect(await requestMaps('?q=urban')).toEqual([
        expect.objectContaining({ geoguessrId: 'cities' }),
      ]);
    });

    test('filters by GeoGuessr ID', async () => {
      expect(await requestMaps('?geoguessrId=cities')).toEqual([
        expect.objectContaining({ geoguessrId: 'cities' }),
      ]);
    });

    test('filters by region', async () => {
      expect(await requestMaps('?region=Europe')).toEqual([
        expect.objectContaining({ geoguessrId: 'alpine' }),
      ]);
    });

    test('filters by both shared states', async () => {
      expect(await requestMaps('?isShared=true')).toEqual([
        expect.objectContaining({ geoguessrId: 'alpine', isShared: true }),
      ]);
      expect(await requestMaps('?isShared=false')).toEqual([
        expect.objectContaining({ geoguessrId: 'cities', isShared: false }),
      ]);
    });

    test('combines filters', async () => {
      expect(await requestMaps('?q=urban&region=Asia&isShared=false')).toEqual([
        expect.objectContaining({ geoguessrId: 'cities' }),
      ]);
    });

    test('hides unpublished and personal maps even under exact ID filter', async () => {
      expect(await requestMaps('?geoguessrId=draft')).toEqual([]);
      expect(await requestMaps('?geoguessrId=personal')).toEqual([]);
    });

    test('orders by verified, then ordering, then diminished games count, nulls first', async () => {
      const [group] = await db
        .insert(mapGroups)
        .values({ name: 'Order group' })
        .returning({ id: mapGroups.id });
      await db.insert(maps).values([
        {
          mapGroupId: group!.id,
          name: 'Verified order 10 null games',
          geoguessrId: 'v10-null',
          isPublished: true,
          isVerified: true,
          ordering: 10,
          numberOfGamesPlayedDiminished: null,
        },
        {
          mapGroupId: group!.id,
          name: 'Verified order 10 some games',
          geoguessrId: 'v10-count',
          isPublished: true,
          isVerified: true,
          ordering: 10,
          numberOfGamesPlayedDiminished: 500,
        },
        {
          mapGroupId: group!.id,
          name: 'Verified order 5',
          geoguessrId: 'v5',
          isPublished: true,
          isVerified: true,
          ordering: 5,
          numberOfGamesPlayedDiminished: 900,
        },
        {
          mapGroupId: group!.id,
          name: 'Unverified high order',
          geoguessrId: 'u20',
          isPublished: true,
          isVerified: false,
          ordering: 20,
          numberOfGamesPlayedDiminished: 999,
        },
      ]);

      expect(await requestMaps()).toEqual([
        expect.objectContaining({ geoguessrId: 'v10-null' }),
        expect.objectContaining({ geoguessrId: 'v10-count' }),
        expect.objectContaining({ geoguessrId: 'v5' }),
        expect.objectContaining({ geoguessrId: 'alpine' }),
        expect.objectContaining({ geoguessrId: 'u20' }),
        expect.objectContaining({ geoguessrId: 'cities' }),
      ]);
    });

    test('omits internal fields and returns null description and authors', async () => {
      const [group] = await db
        .insert(mapGroups)
        .values({ name: 'Null fields group' })
        .returning({ id: mapGroups.id });
      await db.insert(maps).values({
        mapGroupId: group!.id,
        name: 'Bare Map',
        geoguessrId: 'bare',
        description: null,
        authors: null,
        isPublished: true,
        ordering: 1,
        difficulty: 3,
        isVerified: true,
        numberOfGamesPlayed: 42,
      });

      expect(await requestMaps('?geoguessrId=bare')).toEqual([
        {
          geoguessrId: 'bare',
          name: 'Bare Map',
          description: null,
          authors: null,
          isShared: false,
          regions: [],
        },
      ]);
    });

    test('rejects an invalid boolean query value with a validation error', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/maps/?isShared=yes'),
      );
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body).toEqual(
        expect.objectContaining({
          type: 'validation',
          on: 'query',
        }),
      );
    });
  });
});
