import { describe, expect, test } from 'bun:test';
import { db } from '../drizzle';
import { mapGroupLocations, mapGroups, maps, metas } from './schema';

function rejectsWith(operation: () => Promise<unknown>, constraint: string) {
  return operation()
    .then(() => {
      throw new Error(
        `Expected ${constraint} violation, but the insert succeeded`,
      );
    })
    .catch((error: unknown) => {
      const cause = (error as { cause?: { constraint_name?: string } }).cause;
      expect(cause).toEqual(
        expect.objectContaining({ constraint_name: constraint }),
      );
    });
}

describe('map group assignment invariant', () => {
  test('rejects a personal map with a group and a nonpersonal map without a group', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Test group' })
      .returning({ id: mapGroups.id });

    // Valid: personal map with null group.
    await db.insert(maps).values({
      name: 'Personal',
      geoguessrId: 'personal-ok',
      isPersonal: true,
      mapGroupId: null,
    });

    await rejectsWith(async () => {
      await db
        .insert(maps)
        .values({
          name: 'Personal with group',
          geoguessrId: 'personal-bad',
          isPersonal: true,
          mapGroupId: group!.id,
        })
        .returning();
    }, 'map_group_id_not_null');

    await rejectsWith(async () => {
      await db
        .insert(maps)
        .values({
          name: 'Nonpersonal without group',
          geoguessrId: 'nonpersonal-bad',
          isPersonal: false,
          mapGroupId: null,
        })
        .returning();
    }, 'map_group_id_not_null');
  });

  test('accepts a nonpersonal map with a group', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Test group' })
      .returning({ id: mapGroups.id });

    await db.insert(maps).values({
      name: 'Nonpersonal',
      geoguessrId: 'nonpersonal-ok',
      isPersonal: false,
      mapGroupId: group!.id,
    });
  });
});

describe('unique location constraints', () => {
  test('rejects duplicate panoId within a group but allows it across groups', async () => {
    const [groupA] = await db
      .insert(mapGroups)
      .values({ name: 'Group A' })
      .returning({ id: mapGroups.id });
    const [groupB] = await db
      .insert(mapGroups)
      .values({ name: 'Group B' })
      .returning({ id: mapGroups.id });

    const location = {
      mapGroupId: groupA!.id,
      lat: 1,
      lng: 2,
      heading: 3,
      pitch: 4,
      zoom: 5,
      panoId: 'pano-1',
      extraTag: 'tag',
    };

    await db.insert(mapGroupLocations).values(location);
    // Same pano in a different group is allowed.
    await db.insert(mapGroupLocations).values({
      ...location,
      mapGroupId: groupB!.id,
    });

    await rejectsWith(async () => {
      await db.insert(mapGroupLocations).values(location).returning();
    }, 'map_group_locations_unique');
  });

  test('rejects duplicate tagName within a group but allows it across groups', async () => {
    const [groupA] = await db
      .insert(mapGroups)
      .values({ name: 'Group A' })
      .returning({ id: mapGroups.id });
    const [groupB] = await db
      .insert(mapGroups)
      .values({ name: 'Group B' })
      .returning({ id: mapGroups.id });

    const meta = {
      mapGroupId: groupA!.id,
      tagName: 'meta-tag',
      name: 'Meta name',
      note: 'Meta note',
    };

    await db.insert(metas).values(meta);
    // Same tag in a different group is allowed.
    await db.insert(metas).values({ ...meta, mapGroupId: groupB!.id });

    await rejectsWith(async () => {
      await db.insert(metas).values(meta).returning();
    }, 'metas_unique');
  });
});
