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
  });
});
