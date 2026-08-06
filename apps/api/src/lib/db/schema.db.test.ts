import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { AnyPgTable } from 'drizzle-orm/pg-core';
import { db } from '../drizzle';
import {
  levels,
  mapFilters,
  mapGroupLocations,
  mapGroups,
  mapLevels,
  mapLocations,
  mapRegions,
  maps,
  metaImages,
  metaLevels,
  metas,
  regions,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from './schema';

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

async function countRows(table: AnyPgTable) {
  return (await db.select().from(table)).length;
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

describe('group deletion cascade', () => {
  test('deleting a group removes its maps, metas, locations, levels, and synced relations', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Cascade group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    const [level] = await db
      .insert(levels)
      .values({ mapGroupId: groupId, name: 'Level' })
      .returning({ id: levels.id });
    const levelId = level!.id;

    const [map] = await db
      .insert(maps)
      .values({
        name: 'Group map',
        geoguessrId: 'cascade-map',
        isPersonal: false,
        mapGroupId: groupId,
      })
      .returning({ id: maps.id });
    const mapId = map!.id;

    const [meta] = await db
      .insert(metas)
      .values({
        mapGroupId: groupId,
        tagName: 'cascade-tag',
        name: 'Cascade meta',
        note: 'note',
      })
      .returning({ id: metas.id });
    const metaId = meta!.id;

    // Unrelated row that must survive the group deletion.
    const [region] = await db
      .insert(regions)
      .values({ name: 'Unrelated region' })
      .returning({ id: regions.id });

    await db.insert(mapGroupLocations).values({
      mapGroupId: groupId,
      lat: 1,
      lng: 2,
      heading: 3,
      pitch: 4,
      zoom: 5,
      panoId: 'cascade-pano',
      extraTag: 'cascade-tag',
    });

    // Map-owned relations.
    await db.insert(mapLevels).values({ mapId, levelId });
    await db.insert(mapFilters).values({ mapId, tagLike: 'filter' });
    await db.insert(mapRegions).values({ mapId, regionId: region!.id });

    // Meta-owned relations.
    await db.insert(metaLevels).values({ metaId, levelId });
    await db.insert(metaImages).values({
      metaId,
      image_url: 'https://example.com/img.png',
    });

    // Synced relations.
    await db.insert(syncedMetas).values({
      metaId,
      mapGroupId: groupId,
      name: 'Synced meta',
      note: 'note',
      noteFromPlonkit: false,
      footer: '',
      images: [],
    });
    await db.insert(syncedLocations).values({
      syncedMetaId: metaId,
      lat: 1,
      lng: 2,
      heading: 3,
      pitch: 4,
      zoom: 5,
      panoId: 'synced-pano',
      extraTag: 'cascade-tag',
    });
    await db.insert(syncedMapMetas).values({ mapId, syncedMetaId: metaId });

    await db.delete(mapGroups).where(eq(mapGroups.id, groupId));

    const removedTables = [
      ['map_groups', mapGroups],
      ['maps', maps],
      ['metas', metas],
      ['map_group_locations', mapGroupLocations],
      ['levels', levels],
      ['map_levels', mapLevels],
      ['map_filters', mapFilters],
      ['map_regions', mapRegions],
      ['meta_levels', metaLevels],
      ['meta_images', metaImages],
      ['synced_metas', syncedMetas],
      ['synced_locations', syncedLocations],
      ['synced_map_metas', syncedMapMetas],
    ] as const;

    for (const [tableName, table] of removedTables) {
      expect(await countRows(table), `${tableName} should be empty`).toBe(0);
    }

    // Unrelated rows survive the cascade.
    expect(await countRows(regions)).toBe(1);
  });
});

describe('mapLocations view', () => {
  test('applies level, include, and exclude rules with exclude winning', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'View group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    const [levelA] = await db
      .insert(levels)
      .values({ mapGroupId: groupId, name: 'Level A' })
      .returning({ id: levels.id });
    const [levelB] = await db
      .insert(levels)
      .values({ mapGroupId: groupId, name: 'Level B' })
      .returning({ id: levels.id });
    const levelAId = levelA!.id;
    const levelBId = levelB!.id;

    const [metaA] = await db
      .insert(metas)
      .values({
        mapGroupId: groupId,
        tagName: 'alpha',
        name: 'Alpha',
        note: '',
      })
      .returning({ id: metas.id });
    const [metaB] = await db
      .insert(metas)
      .values({ mapGroupId: groupId, tagName: 'beta', name: 'Beta', note: '' })
      .returning({ id: metas.id });
    // metaC has no levels and needs no returned id.
    await db.insert(metas).values({
      mapGroupId: groupId,
      tagName: 'gamma',
      name: 'Gamma',
      note: '',
    });

    await db
      .insert(metaLevels)
      .values({ metaId: metaA!.id, levelId: levelAId });
    await db
      .insert(metaLevels)
      .values({ metaId: metaB!.id, levelId: levelBId });

    async function insertLocation(extraTag: string, panoId: string) {
      await db.insert(mapGroupLocations).values({
        mapGroupId: groupId,
        extraTag,
        panoId,
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
      });
    }
    await insertLocation('alpha', 'pano-alpha');
    await insertLocation('beta', 'pano-beta');
    await insertLocation('gamma', 'pano-gamma');
    // Location without a matching meta must never appear in the view.
    await insertLocation('unknown', 'pano-unknown');

    async function insertMap(geoguessrId: string) {
      const [map] = await db
        .insert(maps)
        .values({
          name: geoguessrId,
          geoguessrId,
          isPersonal: false,
          mapGroupId: groupId,
        })
        .returning({ id: maps.id });
      return map!.id;
    }

    const mapPlain = await insertMap('plain');
    const mapLeveled = await insertMap('leveled');
    await db.insert(mapLevels).values({ mapId: mapLeveled, levelId: levelAId });

    const mapInclude = await insertMap('include');
    await db
      .insert(mapFilters)
      .values({ mapId: mapInclude, tagLike: 'alp%', isExclude: false });

    const mapExclude = await insertMap('exclude');
    await db
      .insert(mapFilters)
      .values({ mapId: mapExclude, tagLike: 'beta', isExclude: true });

    const mapIncludeAndExclude = await insertMap('include-and-exclude');
    await db
      .insert(mapFilters)
      .values({ mapId: mapIncludeAndExclude, tagLike: '%', isExclude: false });
    await db.insert(mapFilters).values({
      mapId: mapIncludeAndExclude,
      tagLike: 'beta',
      isExclude: true,
    });

    async function tagsFor(mapId: number) {
      const rows = await db
        .select()
        .from(mapLocations)
        .where(eq(mapLocations.mapId, mapId));
      return rows.map((row) => row.tagName).sort();
    }

    // No levels or filters: every group location whose tag matches a meta.
    expect(await tagsFor(mapPlain)).toEqual(['alpha', 'beta', 'gamma']);
    // Level rule: only locations whose meta shares a map level appear.
    expect(await tagsFor(mapLeveled)).toEqual(['alpha']);
    // Include rule: only tags matching an include pattern appear.
    expect(await tagsFor(mapInclude)).toEqual(['alpha']);
    // Exclude rule: matching tags are removed, others remain.
    expect(await tagsFor(mapExclude)).toEqual(['alpha', 'gamma']);
    // Exclude wins even when the tag also matches an include pattern.
    expect(await tagsFor(mapIncludeAndExclude)).toEqual(['alpha', 'gamma']);
  });

  test('projects joined location, meta, and map values', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Projection group' })
      .returning({ id: mapGroups.id });
    const groupId = group!.id;

    const [meta] = await db
      .insert(metas)
      .values({
        mapGroupId: groupId,
        tagName: 'alpha',
        name: 'Alpha meta',
        note: 'note-alpha',
        noteHtml: '<p>alpha</p>',
        noteFromPlonkit: true,
        modifiedAt: 2000,
      })
      .returning({ id: metas.id });

    const [map] = await db
      .insert(maps)
      .values({
        name: 'Projection map',
        geoguessrId: 'projection-map',
        isPersonal: false,
        mapGroupId: groupId,
        modifiedAt: 3000,
      })
      .returning({ id: maps.id });

    await db.insert(mapGroupLocations).values({
      mapGroupId: groupId,
      lat: 1.5,
      lng: 2.5,
      heading: 3.5,
      pitch: 4.5,
      zoom: 5.5,
      panoId: 'pano-alpha',
      extraTag: 'alpha',
      extraPanoId: 'extra-pano',
      extraPanoDate: '2020-01-01',
      modifiedAt: 1000,
    });

    const [row] = await db
      .select()
      .from(mapLocations)
      .where(eq(mapLocations.mapId, map!.id));

    expect(row).toEqual({
      mapId: map!.id,
      lat: 1.5,
      lng: 2.5,
      heading: 3.5,
      pitch: 4.5,
      zoom: 5.5,
      panoId: 'pano-alpha',
      metaName: 'Alpha meta',
      extraPanoId: 'extra-pano',
      extraPanoDate: '2020-01-01',
      tagName: 'alpha',
      metaNote: 'note-alpha',
      metaNoteHtml: '<p>alpha</p>',
      metaNoteFromPlonkit: true,
      metaId: meta!.id,
      modifiedAt: 1000,
      metaModifiedAt: 2000,
      mapModifiedAt: 3000,
    });
  });
});

describe('location modifiedAt trigger', () => {
  test('no-op update preserves modifiedAt', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Trigger group' })
      .returning({ id: mapGroups.id });

    const [location] = await db
      .insert(mapGroupLocations)
      .values({
        mapGroupId: group!.id,
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-noop',
        extraTag: 'tag',
        modifiedAt: 1000,
      })
      .returning({ id: mapGroupLocations.id });

    // Reassigning every column to its current value is a no-op update.
    await db
      .update(mapGroupLocations)
      .set({
        mapGroupId: group!.id,
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-noop',
        extraTag: 'tag',
        modifiedAt: 1000,
      })
      .where(eq(mapGroupLocations.id, location!.id));

    const [row] = await db
      .select({ modifiedAt: mapGroupLocations.modifiedAt })
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.id, location!.id));

    expect(row!.modifiedAt).toBe(1000);
  });

  test('meaningful row-data update advances modifiedAt', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Trigger group' })
      .returning({ id: mapGroups.id });

    const [location] = await db
      .insert(mapGroupLocations)
      .values({
        mapGroupId: group!.id,
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-meaningful',
        extraTag: 'tag',
        modifiedAt: 1000,
      })
      .returning({ id: mapGroupLocations.id });

    await db
      .update(mapGroupLocations)
      .set({ extraTag: 'tag-changed' })
      .where(eq(mapGroupLocations.id, location!.id));

    const [row] = await db
      .select({ modifiedAt: mapGroupLocations.modifiedAt })
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.id, location!.id));

    expect(row!.modifiedAt).toBeGreaterThan(1000);
  });
});
