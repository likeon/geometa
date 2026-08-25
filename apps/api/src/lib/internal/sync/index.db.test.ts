import { describe, expect, test } from 'bun:test';
import {
  levels,
  mapFilters,
  mapGroupLocationMetas,
  mapGroupLocations,
  mapGroups,
  mapLevels,
  maps,
  metaImages,
  metaLevels,
  metas,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { normalizeGeoJson } from '@api/lib/utils/geojson';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { syncMapGroup } from './index';

const mapArea = normalizeGeoJson({
  type: 'Polygon',
  coordinates: [
    [
      [-78, 38],
      [-76, 38],
      [-76, 40],
      [-78, 38],
    ],
  ],
});

async function linkLocationsByTag(groupId: number) {
  await db.$primary.execute(sql`
    INSERT INTO ${mapGroupLocationMetas} (location_id, meta_id, map_group_id)
    SELECT location.id, meta.id, location.map_group_id
    FROM ${mapGroupLocations} location
    JOIN ${metas} meta
      ON meta.map_group_id = location.map_group_id
     AND meta.tag_name = location.extra_tag
    WHERE location.map_group_id = ${groupId}
    ON CONFLICT DO NOTHING
  `);
}

async function seedNullSyncedAtFixture(geoguessrId = 'full-sync-map') {
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Full sync group' })
    .returning({ id: mapGroups.id, syncedAt: mapGroups.syncedAt });
  const groupId = group!.id;
  expect(group!.syncedAt).toBeNull();

  const [usMeta] = await db
    .insert(metas)
    .values({
      mapGroupId: groupId,
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      noteHtml: '<p><strong>Capital:</strong> Washington</p>',
      footer: 'See [source](https://example.com)',
      footerHtml: '<p>See <a href="https://example.com">source</a></p>',
      noteFromPlonkit: true,
      geoJson: mapArea,
      modifiedAt: 100,
    })
    .returning({ id: metas.id });
  const [jpMeta] = await db
    .insert(metas)
    .values({
      mapGroupId: groupId,
      tagName: 'Japan',
      name: 'Japan',
      note: '**Capital:** Tokyo',
      noteHtml: '<p><strong>Capital:</strong> Tokyo</p>',
      footer: '',
      footerHtml: '',
      noteFromPlonkit: false,
      modifiedAt: 200,
    })
    .returning({ id: metas.id });

  // Only the 'us' meta carries images; the image-less meta must sync with an
  // empty image array.
  await db.insert(metaImages).values([
    { metaId: usMeta!.id, image_url: 'https://img.example/a.jpg', order: 0 },
    { metaId: usMeta!.id, image_url: 'https://img.example/b.jpg', order: 1 },
  ]);

  await db.insert(mapGroupLocations).values([
    {
      mapGroupId: groupId,
      lat: 38.9,
      lng: -77,
      heading: 1,
      pitch: 2,
      zoom: 3,
      panoId: 'pano-us-1',
      extraTag: 'us',
      modifiedAt: 100,
    },
    {
      mapGroupId: groupId,
      lat: 35.6,
      lng: 139.7,
      heading: 4,
      pitch: 5,
      zoom: 6,
      panoId: 'pano-jp-1',
      extraTag: 'Japan',
      modifiedAt: 200,
    },
    {
      // No meta carries this tag, so full sync must not emit it.
      mapGroupId: groupId,
      lat: 0,
      lng: 0,
      heading: 0,
      pitch: 0,
      zoom: 0,
      panoId: 'pano-orphan',
      extraTag: 'NoSuchTag',
      modifiedAt: 300,
    },
  ]);
  await linkLocationsByTag(groupId);

  // Map without levels or filters: every meta in the group is eligible.
  const [map] = await db
    .insert(maps)
    .values({
      mapGroupId: groupId,
      name: 'World map',
      geoguessrId,
    })
    .returning({ id: maps.id });

  return {
    groupId,
    usMetaId: usMeta!.id,
    jpMetaId: jpMeta!.id,
    mapId: map!.id,
  };
}

describe('syncMapGroup null syncedAt', () => {
  test('full sync persists eligible metas, locations, map-meta associations, and the sync timestamp', async () => {
    const { groupId, usMetaId, jpMetaId, mapId } =
      await seedNullSyncedAtFixture();
    const before = Math.floor(Date.now() / 1000);

    const syncedAt = await syncMapGroup({ id: groupId, syncedAt: null });

    const after = Math.floor(Date.now() / 1000);
    expect(syncedAt).toBeGreaterThanOrEqual(before);
    expect(syncedAt).toBeLessThanOrEqual(after);

    // Returned timestamp is persisted on the group.
    const [group] = await db
      .select({ syncedAt: mapGroups.syncedAt })
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    expect(group!.syncedAt).toBe(syncedAt);

    // Every group meta is synced with its exact payload.
    const syncedMetaRows = await db
      .select()
      .from(syncedMetas)
      .orderBy(asc(syncedMetas.metaId));
    expect(syncedMetaRows).toEqual([
      {
        metaId: usMetaId,
        mapGroupId: groupId,
        name: 'United States',
        // The sync payload stores the rendered html, not the raw markdown.
        note: '<p><strong>Capital:</strong> Washington</p>',
        noteFromPlonkit: true,
        footer: '<p>See <a href="https://example.com">source</a></p>',
        images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        geoJson: mapArea,
      },
      {
        metaId: jpMetaId,
        mapGroupId: groupId,
        name: 'Japan',
        note: '<p><strong>Capital:</strong> Tokyo</p>',
        noteFromPlonkit: false,
        footer: '',
        images: [],
        geoJson: null,
      },
    ]);

    // Only locations whose extra tag matches a group meta are synced; the
    // orphan location stays out. Country derives from the tag name.
    const syncedLocationRows = await db
      .select()
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.panoId));
    expect(syncedLocationRows).toEqual([
      {
        syncedMetaId: jpMetaId,
        lat: 35.6,
        lng: 139.7,
        heading: 4,
        pitch: 5,
        zoom: 6,
        panoId: 'pano-jp-1',
        extraTag: 'Japan',
        extraPanoId: null,
        extraPanoDate: null,
        country: 'Japan',
      },
      {
        syncedMetaId: usMetaId,
        lat: 38.9,
        lng: -77,
        heading: 1,
        pitch: 2,
        zoom: 3,
        panoId: 'pano-us-1',
        extraTag: 'us',
        extraPanoId: null,
        extraPanoDate: null,
        country: 'us',
      },
    ]);

    // Every eligible meta is associated with the group's map.
    const associationRows = await db
      .select()
      .from(syncedMapMetas)
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(associationRows).toEqual([
      { mapId, syncedMetaId: usMetaId },
      { mapId, syncedMetaId: jpMetaId },
    ]);
  });

  test('syncs every linked meta and removes or renames relationships incrementally', async () => {
    const { groupId, usMetaId, jpMetaId } = await seedNullSyncedAtFixture();
    const [location] = await db
      .select({ id: mapGroupLocations.id })
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.panoId, 'pano-us-1'));
    await db.insert(mapGroupLocationMetas).values({
      locationId: location!.id,
      metaId: jpMetaId,
      mapGroupId: groupId,
    });

    const syncedAt = await syncMapGroup({ id: groupId, syncedAt: null });
    expect(
      await db
        .select({
          metaId: syncedLocations.syncedMetaId,
          extraTag: syncedLocations.extraTag,
        })
        .from(syncedLocations)
        .where(eq(syncedLocations.panoId, 'pano-us-1'))
        .orderBy(syncedLocations.syncedMetaId),
    ).toEqual([
      { metaId: usMetaId, extraTag: 'us' },
      { metaId: jpMetaId, extraTag: 'Japan' },
    ]);

    await db
      .delete(mapGroupLocationMetas)
      .where(
        and(
          eq(mapGroupLocationMetas.locationId, location!.id),
          eq(mapGroupLocationMetas.metaId, usMetaId),
        ),
      );
    await db
      .update(metas)
      .set({ tagName: 'Japan v2', modifiedAt: syncedAt + 1 })
      .where(eq(metas.id, jpMetaId));
    await syncMapGroup({ id: groupId, syncedAt });

    expect(
      await db
        .select({
          metaId: syncedLocations.syncedMetaId,
          extraTag: syncedLocations.extraTag,
        })
        .from(syncedLocations)
        .where(eq(syncedLocations.panoId, 'pano-us-1')),
    ).toEqual([{ metaId: jpMetaId, extraTag: 'Japan v2' }]);
  });
});

describe('syncMapGroup incremental modifiedAt boundary', () => {
  async function seedIncrementalFixture() {
    const { groupId, usMetaId, jpMetaId } = await seedNullSyncedAtFixture();
    // Baseline: run a full sync, then treat its timestamp as the boundary for
    // the incremental sync under test.
    const syncedAt = await syncMapGroup({ id: groupId, syncedAt: null });
    return { groupId, usMetaId, jpMetaId, syncedAt };
  }

  test('re-syncs metas at and above the boundary', async () => {
    const { groupId, usMetaId, jpMetaId, syncedAt } =
      await seedIncrementalFixture();

    // Meaningful change, but modifiedAt lands exactly on the sync boundary.
    await db
      .update(metas)
      .set({ name: 'United States v2', modifiedAt: syncedAt })
      .where(eq(metas.id, usMetaId));

    // Meaningful change with modifiedAt strictly above the boundary.
    await db
      .update(metas)
      .set({ name: 'Japan v2', geoJson: mapArea, modifiedAt: syncedAt + 10 })
      .where(eq(metas.id, jpMetaId));

    const timestamp = await syncMapGroup({ id: groupId, syncedAt });

    // The incremental sync advances the group's timestamp like a full sync.
    const [group] = await db
      .select({ syncedAt: mapGroups.syncedAt })
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    expect(group!.syncedAt).toBe(timestamp);

    // modifiedAt == syncedAt: same-second changes must reach the synced payload.
    const [usRow] = await db
      .select({ name: syncedMetas.name })
      .from(syncedMetas)
      .where(eq(syncedMetas.metaId, usMetaId));
    expect(usRow!.name).toBe('United States v2');

    // modifiedAt > syncedAt: the change must propagate.
    const [jpRow] = await db
      .select({ name: syncedMetas.name, geoJson: syncedMetas.geoJson })
      .from(syncedMetas)
      .where(eq(syncedMetas.metaId, jpMetaId));
    expect(jpRow).toEqual({ name: 'Japan v2', geoJson: mapArea });
  });

  test('syncs locations at and above the boundary', async () => {
    const { groupId, usMetaId, syncedAt } = await seedIncrementalFixture();

    await db.insert(mapGroupLocations).values([
      {
        mapGroupId: groupId,
        lat: 10,
        lng: 11,
        heading: 0,
        pitch: 0,
        zoom: 0,
        panoId: 'pano-equal',
        extraTag: 'us',
        modifiedAt: syncedAt,
      },
      {
        mapGroupId: groupId,
        lat: 12.5,
        lng: -8,
        heading: 7,
        pitch: 8,
        zoom: 9,
        panoId: 'pano-new',
        extraTag: 'us',
        extraPanoId: 'extra-1',
        extraPanoDate: '2024-01-01',
        modifiedAt: syncedAt + 10,
      },
    ]);
    await linkLocationsByTag(groupId);

    await syncMapGroup({ id: groupId, syncedAt });

    const syncedLocationRows = await db
      .select()
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.panoId));
    // pano-equal (modifiedAt == syncedAt) must reach the synced set.
    expect(syncedLocationRows.map((row) => row.panoId)).toEqual([
      'pano-equal',
      'pano-jp-1',
      'pano-new',
      'pano-us-1',
    ]);

    // pano-new (modifiedAt > syncedAt) is synced with its full payload.
    const newRow = syncedLocationRows.find((row) => row.panoId === 'pano-new');
    expect(newRow).toEqual({
      syncedMetaId: usMetaId,
      lat: 12.5,
      lng: -8,
      heading: 7,
      pitch: 8,
      zoom: 9,
      panoId: 'pano-new',
      extraTag: 'us',
      extraPanoId: 'extra-1',
      extraPanoDate: '2024-01-01',
      country: 'us',
    });
  });
});

describe('syncMapGroup street view setting', () => {
  async function seedStreetViewFixture() {
    // The sync_include_locations_not_on_street_view setting defaults to true,
    // which includes every location regardless of is_on_street_view.
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Street view group' })
      .returning({ id: mapGroups.id, syncedAt: mapGroups.syncedAt });
    const groupId = group!.id;
    expect(group!.syncedAt).toBeNull();

    await db
      .insert(metas)
      .values({
        mapGroupId: groupId,
        tagName: 'us',
        name: 'United States',
        note: '',
        noteHtml: '',
        footer: '',
        footerHtml: '',
        noteFromPlonkit: false,
        modifiedAt: 100,
      })
      .returning({ id: metas.id });

    // One location per is_on_street_view state: true, null, false.
    await db.insert(mapGroupLocations).values([
      {
        mapGroupId: groupId,
        lat: 38.9,
        lng: -77,
        heading: 1,
        pitch: 2,
        zoom: 3,
        panoId: 'pano-sv-true',
        extraTag: 'us',
        isOnStreetView: true,
        modifiedAt: 100,
      },
      {
        mapGroupId: groupId,
        lat: 35.6,
        lng: 139.7,
        heading: 4,
        pitch: 5,
        zoom: 6,
        panoId: 'pano-sv-null',
        extraTag: 'us',
        isOnStreetView: null,
        modifiedAt: 100,
      },
      {
        mapGroupId: groupId,
        lat: 51.5,
        lng: -0.1,
        heading: 7,
        pitch: 8,
        zoom: 9,
        panoId: 'pano-sv-false',
        extraTag: 'us',
        isOnStreetView: false,
        modifiedAt: 100,
      },
    ]);
    await linkLocationsByTag(groupId);

    return { groupId };
  }

  test('setting true includes true/null/false rows; transition to false removes the false row', async () => {
    const { groupId } = await seedStreetViewFixture();

    // Setting true (default): every street-view state is eligible and synced.
    const firstSyncedAt = await syncMapGroup({ id: groupId, syncedAt: null });
    const afterFirstSync = await db
      .select({ panoId: syncedLocations.panoId })
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.panoId));
    expect(afterFirstSync.map((row) => row.panoId)).toEqual([
      'pano-sv-false',
      'pano-sv-null',
      'pano-sv-true',
    ]);

    // Setting false: the false row no longer matches the sync filter, so the
    // next sync removes it while true and null rows stay.
    await db
      .update(mapGroups)
      .set({ syncIncludeLocationsNotOnStreetView: false })
      .where(eq(mapGroups.id, groupId));

    await syncMapGroup({ id: groupId, syncedAt: firstSyncedAt });

    const afterTransition = await db
      .select({ panoId: syncedLocations.panoId })
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.panoId));
    expect(afterTransition.map((row) => row.panoId)).toEqual([
      'pano-sv-null',
      'pano-sv-true',
    ]);
  });
});

describe('syncMapGroup map-meta membership', () => {
  async function seedMembershipFixture() {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Membership group' })
      .returning({ id: mapGroups.id, syncedAt: mapGroups.syncedAt });
    const groupId = group!.id;
    expect(group!.syncedAt).toBeNull();

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

    async function insertMeta(tagName: string, levelId: number) {
      const [meta] = await db
        .insert(metas)
        .values({
          mapGroupId: groupId,
          tagName,
          name: tagName,
          note: '',
          noteHtml: '',
          footer: '',
          footerHtml: '',
          noteFromPlonkit: false,
          modifiedAt: 100,
        })
        .returning({ id: metas.id });
      const metaId = meta!.id;
      await db.insert(metaLevels).values({ metaId, levelId });
      return metaId;
    }

    // alpha and zeta share the map's level; alphb holds the other level, and
    // beta matches no include pattern despite holding the map's level.
    const alphaMetaId = await insertMeta('alpha', levelAId);
    const alphbMetaId = await insertMeta('alphb', levelBId);
    const betaMetaId = await insertMeta('beta', levelAId);
    const zetaMetaId = await insertMeta('zeta', levelAId);

    // Map with level A, include patterns 'alp%' and 'zet%', exclude 'zeta'.
    const [map] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Membership map',
        geoguessrId: 'membership-map',
      })
      .returning({ id: maps.id });
    const mapId = map!.id;
    await db.insert(mapLevels).values({ mapId, levelId: levelAId });
    await db
      .insert(mapFilters)
      .values({ mapId, tagLike: 'alp%', isExclude: false });
    await db
      .insert(mapFilters)
      .values({ mapId, tagLike: 'zet%', isExclude: false });
    await db
      .insert(mapFilters)
      .values({ mapId, tagLike: 'zeta', isExclude: true });

    return { groupId, mapId, alphaMetaId, alphbMetaId, betaMetaId, zetaMetaId };
  }

  test('map membership combines levels, include filters, and exclude filters; exclude wins', async () => {
    const { groupId, mapId, alphaMetaId, alphbMetaId, betaMetaId, zetaMetaId } =
      await seedMembershipFixture();

    await syncMapGroup({ id: groupId, syncedAt: null });

    // Membership filtering happens at the map-meta association, not at the
    // meta sync: every group meta is synced...
    const syncedMetaIds = await db
      .select({ metaId: syncedMetas.metaId })
      .from(syncedMetas)
      .where(eq(syncedMetas.mapGroupId, groupId))
      .orderBy(asc(syncedMetas.metaId));
    expect(syncedMetaIds.map((row) => row.metaId)).toEqual([
      alphaMetaId,
      alphbMetaId,
      betaMetaId,
      zetaMetaId,
    ]);

    // ...but only the meta passing every membership rule gets an association:
    // - alpha: level A, include 'alp%', not excluded.
    // - alphb: matches include 'alp%' but misses level A.
    // - beta: holds level A but matches no include pattern.
    // - zeta: level A and include 'zet%', but the exclude filter wins.
    const associationRows = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(associationRows).toEqual([{ mapId, syncedMetaId: alphaMetaId }]);
  });
});

describe('syncMapGroup incremental update/delete propagation', () => {
  test('propagates updated and deleted source metas/locations while other groups stay untouched', async () => {
    const target = await seedNullSyncedAtFixture('target-map');
    const other = await seedNullSyncedAtFixture('other-map');

    // A second us-tagged location lets source-location deletion be exercised
    // independently of the meta-deletion cascade.
    await db.insert(mapGroupLocations).values({
      mapGroupId: target.groupId,
      lat: 40.7,
      lng: -74,
      heading: 13,
      pitch: 14,
      zoom: 15,
      panoId: 'pano-us-2',
      extraTag: 'us',
      modifiedAt: 100,
    });
    await linkLocationsByTag(target.groupId);

    const targetSyncedAt = await syncMapGroup({
      id: target.groupId,
      syncedAt: null,
    });
    const otherSyncedAt = await syncMapGroup({
      id: other.groupId,
      syncedAt: null,
    });
    const otherMetasBefore = await db
      .select()
      .from(syncedMetas)
      .where(eq(syncedMetas.mapGroupId, other.groupId))
      .orderBy(asc(syncedMetas.metaId));
    const otherLocationsBefore = await db
      .select()
      .from(syncedLocations)
      .where(
        or(
          eq(syncedLocations.syncedMetaId, other.usMetaId),
          eq(syncedLocations.syncedMetaId, other.jpMetaId),
        ),
      )
      .orderBy(asc(syncedLocations.syncedMetaId));
    const otherAssociationsBefore = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, other.mapId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));

    // Target-group source mutations the incremental sync must propagate:
    // updated meta, updated location, deleted meta, deleted location.
    await db
      .update(metas)
      .set({ name: 'United States v2', modifiedAt: targetSyncedAt + 10 })
      .where(eq(metas.id, target.usMetaId));
    await db.delete(metas).where(eq(metas.id, target.jpMetaId));
    await db
      .update(mapGroupLocations)
      .set({
        lat: 51.5,
        lng: -0.1,
        heading: 10,
        pitch: 11,
        zoom: 12,
        extraPanoId: 'extra-us-1',
        extraPanoDate: '2025-06-01',
      })
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, target.groupId),
          eq(mapGroupLocations.panoId, 'pano-us-1'),
        ),
      );
    await db
      .delete(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, target.groupId),
          eq(mapGroupLocations.panoId, 'pano-us-2'),
        ),
      );

    // The other group also carries pending source changes above its own
    // boundary; only the target group syncs, so they must not reach synced
    // tables.
    await db
      .update(metas)
      .set({ name: 'Other United States v2', modifiedAt: otherSyncedAt + 10 })
      .where(eq(metas.id, other.usMetaId));
    await db
      .update(mapGroupLocations)
      .set({ lat: 1.5, modifiedAt: otherSyncedAt + 10 })
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, other.groupId),
          eq(mapGroupLocations.panoId, 'pano-jp-1'),
        ),
      );

    await syncMapGroup({ id: target.groupId, syncedAt: targetSyncedAt - 1 });

    // Updated meta propagates; the deleted meta disappears from synced_metas.
    const targetSyncedMetas = await db
      .select({ metaId: syncedMetas.metaId, name: syncedMetas.name })
      .from(syncedMetas)
      .where(eq(syncedMetas.mapGroupId, target.groupId))
      .orderBy(asc(syncedMetas.metaId));
    expect(targetSyncedMetas).toEqual([
      { metaId: target.usMetaId, name: 'United States v2' },
    ]);

    // The updated location propagates; the deleted source location and the
    // deleted meta's location are gone.
    const targetSyncedLocations = await db
      .select({
        syncedMetaId: syncedLocations.syncedMetaId,
        panoId: syncedLocations.panoId,
        lat: syncedLocations.lat,
      })
      .from(syncedLocations)
      .where(eq(syncedLocations.syncedMetaId, target.usMetaId))
      .orderBy(asc(syncedLocations.panoId));
    expect(targetSyncedLocations).toEqual([
      { syncedMetaId: target.usMetaId, panoId: 'pano-us-1', lat: 51.5 },
    ]);
    const deletedMetaLocations = await db
      .select()
      .from(syncedLocations)
      .where(eq(syncedLocations.syncedMetaId, target.jpMetaId));
    expect(deletedMetaLocations).toEqual([]);

    // Only the surviving meta keeps its map-meta association.
    const targetAssociations = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, target.mapId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(targetAssociations).toEqual([
      { mapId: target.mapId, syncedMetaId: target.usMetaId },
    ]);

    const otherSyncedMetas = await db
      .select()
      .from(syncedMetas)
      .where(eq(syncedMetas.mapGroupId, other.groupId))
      .orderBy(asc(syncedMetas.metaId));
    expect(otherSyncedMetas).toEqual(otherMetasBefore);

    const otherLocations = await db
      .select()
      .from(syncedLocations)
      .where(
        or(
          eq(syncedLocations.syncedMetaId, other.usMetaId),
          eq(syncedLocations.syncedMetaId, other.jpMetaId),
        ),
      )
      .orderBy(asc(syncedLocations.syncedMetaId));
    expect(otherLocations).toEqual(otherLocationsBefore);

    const otherAssociations = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, other.mapId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(otherAssociations).toEqual(otherAssociationsBefore);
  });
});

describe('syncMapGroup source tag/pano reassignment', () => {
  test('reassignment above the boundary removes stale identities and inserts replacements without cross-group leakage', async () => {
    const target = await seedNullSyncedAtFixture('reassign-target');
    const other = await seedNullSyncedAtFixture('reassign-other');

    const targetSyncedAt = await syncMapGroup({
      id: target.groupId,
      syncedAt: null,
    });
    await syncMapGroup({ id: other.groupId, syncedAt: null });

    // Snapshot the other group's synced locations. It deliberately shares the
    // same pano ids and tag names as the target group so any cross-group
    // leakage in the target-group deletes would show up here.
    const otherLocationsBefore = await db
      .select()
      .from(syncedLocations)
      .where(
        or(
          eq(syncedLocations.syncedMetaId, other.usMetaId),
          eq(syncedLocations.syncedMetaId, other.jpMetaId),
        ),
      )
      .orderBy(asc(syncedLocations.syncedMetaId), asc(syncedLocations.panoId));

    // Reassignments are written as delete + insert: the production BEFORE
    // UPDATE trigger on map_group_locations overwrites any explicit
    // modified_at with NOW(), so an UPDATE cannot carry a controlled
    // timestamp. Delete first because (map_group_id, pano_id) is unique.
    //
    // Tag reassignment: pano-us-1 leaves the 'us' meta and joins 'Japan'.
    await db
      .delete(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, target.groupId),
          eq(mapGroupLocations.panoId, 'pano-us-1'),
        ),
      );
    await db.insert(mapGroupLocations).values({
      mapGroupId: target.groupId,
      lat: 38.9,
      lng: -77,
      heading: 1,
      pitch: 2,
      zoom: 3,
      panoId: 'pano-us-1',
      extraTag: 'Japan',
      modifiedAt: targetSyncedAt + 10,
    });

    // Pano reassignment: pano-jp-1 keeps its 'Japan' tag but gets a new pano
    // id.
    await db
      .delete(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, target.groupId),
          eq(mapGroupLocations.panoId, 'pano-jp-1'),
        ),
      );
    await db.insert(mapGroupLocations).values({
      mapGroupId: target.groupId,
      lat: 35.6,
      lng: 139.7,
      heading: 4,
      pitch: 5,
      zoom: 6,
      panoId: 'pano-jp-2',
      extraTag: 'Japan',
      modifiedAt: targetSyncedAt + 10,
    });
    await linkLocationsByTag(target.groupId);

    await syncMapGroup({ id: target.groupId, syncedAt: targetSyncedAt });

    // Stale identities are gone, replacements exist, and each replacement
    // carries the exact payload of its reassigned source row.
    const targetLocations = await db
      .select()
      .from(syncedLocations)
      .where(
        or(
          eq(syncedLocations.syncedMetaId, target.usMetaId),
          eq(syncedLocations.syncedMetaId, target.jpMetaId),
        ),
      )
      .orderBy(asc(syncedLocations.syncedMetaId), asc(syncedLocations.panoId));
    expect(
      targetLocations.map((row) => `${row.syncedMetaId}:${row.panoId}`),
    ).toEqual([`${target.jpMetaId}:pano-jp-2`, `${target.jpMetaId}:pano-us-1`]);

    const replacedPanoRow = targetLocations.find(
      (row) => row.panoId === 'pano-jp-2',
    );
    expect(replacedPanoRow).toEqual({
      syncedMetaId: target.jpMetaId,
      lat: 35.6,
      lng: 139.7,
      heading: 4,
      pitch: 5,
      zoom: 6,
      panoId: 'pano-jp-2',
      extraTag: 'Japan',
      extraPanoId: null,
      extraPanoDate: null,
      country: 'Japan',
    });
    const retaggedRow = targetLocations.find(
      (row) => row.panoId === 'pano-us-1',
    );
    expect(retaggedRow).toEqual({
      syncedMetaId: target.jpMetaId,
      lat: 38.9,
      lng: -77,
      heading: 1,
      pitch: 2,
      zoom: 3,
      panoId: 'pano-us-1',
      extraTag: 'Japan',
      extraPanoId: null,
      extraPanoDate: null,
      country: 'Japan',
    });

    // The other group shares pano ids and tag names with the target group;
    // its synced locations must stay byte-identical.
    const otherLocations = await db
      .select()
      .from(syncedLocations)
      .where(
        or(
          eq(syncedLocations.syncedMetaId, other.usMetaId),
          eq(syncedLocations.syncedMetaId, other.jpMetaId),
        ),
      )
      .orderBy(asc(syncedLocations.syncedMetaId), asc(syncedLocations.panoId));
    expect(otherLocations).toEqual(otherLocationsBefore);
  });
});

describe('syncMapGroup incremental membership move', () => {
  test('meta leaving map A for map B removes the stale association and inserts the new one', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Membership move group' })
      .returning({ id: mapGroups.id, syncedAt: mapGroups.syncedAt });
    const groupId = group!.id;
    expect(group!.syncedAt).toBeNull();

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

    async function insertMeta(
      tagName: string,
      levelId: number,
      modifiedAt: number,
    ) {
      const [meta] = await db
        .insert(metas)
        .values({
          mapGroupId: groupId,
          tagName,
          name: tagName,
          note: '',
          noteHtml: '',
          footer: '',
          footerHtml: '',
          noteFromPlonkit: false,
          modifiedAt,
        })
        .returning({ id: metas.id });
      const metaId = meta!.id;
      await db.insert(metaLevels).values({ metaId, levelId });
      return metaId;
    }

    // x and y hold level A (map A); z holds level B (map B). x later moves
    // from level A to level B, leaving map A while y keeps map A in the
    // membership source so its stale association can be deleted.
    const xMetaId = await insertMeta('x', levelAId, 100);
    const yMetaId = await insertMeta('y', levelAId, 100);
    const zMetaId = await insertMeta('z', levelBId, 100);

    const [mapA] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Map A',
        geoguessrId: 'membership-move-a',
      })
      .returning({ id: maps.id });
    const mapAId = mapA!.id;
    await db.insert(mapLevels).values({ mapId: mapAId, levelId: levelAId });

    const [mapB] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Map B',
        geoguessrId: 'membership-move-b',
      })
      .returning({ id: maps.id });
    const mapBId = mapB!.id;
    await db.insert(mapLevels).values({ mapId: mapBId, levelId: levelBId });

    const syncedAt = await syncMapGroup({ id: groupId, syncedAt: null });

    // Baseline: x belongs to map A.
    const beforeMapA = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapAId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(beforeMapA).toEqual([
      { mapId: mapAId, syncedMetaId: xMetaId },
      { mapId: mapAId, syncedMetaId: yMetaId },
    ]);

    // Source membership change with a controlled timestamp strictly above the
    // sync boundary: x leaves level A and joins level B.
    await db
      .update(metas)
      .set({ modifiedAt: syncedAt + 10 })
      .where(eq(metas.id, xMetaId));
    await db
      .delete(metaLevels)
      .where(
        and(eq(metaLevels.metaId, xMetaId), eq(metaLevels.levelId, levelAId)),
      );
    await db.insert(metaLevels).values({ metaId: xMetaId, levelId: levelBId });

    await syncMapGroup({ id: groupId, syncedAt });

    // x's stale map-A association is gone and the map-B association exists.
    const after = await db
      .select()
      .from(syncedMapMetas)
      .orderBy(asc(syncedMapMetas.mapId), asc(syncedMapMetas.syncedMetaId));
    expect(after).toEqual([
      { mapId: mapAId, syncedMetaId: yMetaId },
      { mapId: mapBId, syncedMetaId: xMetaId },
      { mapId: mapBId, syncedMetaId: zMetaId },
    ]);
  });
});

describe('syncMapGroup map-meta membership transition to zero', () => {
  test.todo('map with associations dropping to zero removes all stale map-meta rows', async () => {
    const [group] = await db
      .insert(mapGroups)
      .values({ name: 'Zero membership group' })
      .returning({ id: mapGroups.id, syncedAt: mapGroups.syncedAt });
    const groupId = group!.id;
    expect(group!.syncedAt).toBeNull();

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

    async function insertMeta(tagName: string, levelId: number) {
      const [meta] = await db
        .insert(metas)
        .values({
          mapGroupId: groupId,
          tagName,
          name: tagName,
          note: '',
          noteHtml: '',
          footer: '',
          footerHtml: '',
          noteFromPlonkit: false,
          modifiedAt: 100,
        })
        .returning({ id: metas.id });
      const metaId = meta!.id;
      await db.insert(metaLevels).values({ metaId, levelId });
      return metaId;
    }

    // x and y hold level A (map A); z holds level B (map B). x and y later
    // lose level A entirely, so map A's membership drops from two metas to
    // zero while map B stays untouched.
    const xMetaId = await insertMeta('x', levelAId);
    const yMetaId = await insertMeta('y', levelAId);
    const zMetaId = await insertMeta('z', levelBId);

    const [mapA] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Map A',
        geoguessrId: 'zero-membership-a',
      })
      .returning({ id: maps.id });
    const mapAId = mapA!.id;
    await db.insert(mapLevels).values({ mapId: mapAId, levelId: levelAId });

    const [mapB] = await db
      .insert(maps)
      .values({
        mapGroupId: groupId,
        name: 'Map B',
        geoguessrId: 'zero-membership-b',
      })
      .returning({ id: maps.id });
    const mapBId = mapB!.id;
    await db.insert(mapLevels).values({ mapId: mapBId, levelId: levelBId });

    const syncedAt = await syncMapGroup({ id: groupId, syncedAt: null });

    // Baseline: map A holds x and y; unrelated map B holds z.
    const beforeMapA = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapAId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(beforeMapA).toEqual([
      { mapId: mapAId, syncedMetaId: xMetaId },
      { mapId: mapAId, syncedMetaId: yMetaId },
    ]);
    const beforeMapB = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapBId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(beforeMapB).toEqual([{ mapId: mapBId, syncedMetaId: zMetaId }]);

    // Source membership change with a controlled timestamp strictly above the
    // sync boundary: x and y leave level A, leaving map A with no matching
    // meta.
    for (const metaId of [xMetaId, yMetaId]) {
      await db
        .update(metas)
        .set({ modifiedAt: syncedAt + 10 })
        .where(eq(metas.id, metaId));
      await db
        .delete(metaLevels)
        .where(
          and(eq(metaLevels.metaId, metaId), eq(metaLevels.levelId, levelAId)),
        );
    }

    await syncMapGroup({ id: groupId, syncedAt });

    // Desired contract: the transition to zero matching metas removes every
    // stale map-A association...
    const afterMapA = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapAId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(afterMapA).toEqual([]);

    // ...while unrelated map B keeps its association untouched.
    const afterMapB = await db
      .select()
      .from(syncedMapMetas)
      .where(eq(syncedMapMetas.mapId, mapBId))
      .orderBy(asc(syncedMapMetas.syncedMetaId));
    expect(afterMapB).toEqual(beforeMapB);
  });
});

describe('syncMapGroup late SQL failure rollback', () => {
  test('rejection rolls back every synced table and the group timestamp', async () => {
    const { groupId } = await seedNullSyncedAtFixture();

    const baselineGroupSyncedAt = await db
      .select({ syncedAt: mapGroups.syncedAt })
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    const baselineMetas = await db
      .select()
      .from(syncedMetas)
      .orderBy(asc(syncedMetas.metaId));
    const baselineLocations = await db
      .select()
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.syncedMetaId), asc(syncedLocations.panoId));
    const baselineAssociations = await db
      .select()
      .from(syncedMapMetas)
      .orderBy(asc(syncedMapMetas.mapId), asc(syncedMapMetas.syncedMetaId));
    expect(baselineGroupSyncedAt[0]!.syncedAt).toBeNull();
    expect(baselineMetas).toEqual([]);
    expect(baselineLocations).toEqual([]);
    expect(baselineAssociations).toEqual([]);

    // Make the transaction's final statement (the map_groups synced_at
    // update) fail deterministically, after the synced-metas,
    // synced-locations, and map-meta writes already executed in-transaction.
    await db.$primary.execute(sql`
      CREATE OR REPLACE FUNCTION geometa_test_fail_sync()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'intentional test failure';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.$primary.execute(sql`
      CREATE TRIGGER geometa_test_fail_sync_trigger
      BEFORE UPDATE ON map_groups
      FOR EACH ROW EXECUTE FUNCTION geometa_test_fail_sync()
    `);

    try {
      let rejection: unknown;
      try {
        await syncMapGroup({ id: groupId, syncedAt: null });
        throw new Error('expected syncMapGroup to reject');
      } catch (error) {
        rejection = error;
      }

      // The failure lands on the transaction's final statement (the
      // map_groups synced_at update), raised by the trigger.
      expect(rejection).toMatchObject({
        message: expect.stringContaining('synced_at'),
        cause: expect.objectContaining({ code: 'P0001' }),
      });
    } finally {
      await db.$primary.execute(sql`
        DROP TRIGGER IF EXISTS geometa_test_fail_sync_trigger ON map_groups
      `);
      await db.$primary.execute(sql`
        DROP FUNCTION IF EXISTS geometa_test_fail_sync()
      `);
    }

    // Rejection rolled back all in-transaction writes: synced tables and the
    // group timestamp stay exactly at baseline.
    const afterGroupSyncedAt = await db
      .select({ syncedAt: mapGroups.syncedAt })
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    const afterMetas = await db
      .select()
      .from(syncedMetas)
      .orderBy(asc(syncedMetas.metaId));
    const afterLocations = await db
      .select()
      .from(syncedLocations)
      .orderBy(asc(syncedLocations.syncedMetaId), asc(syncedLocations.panoId));
    const afterAssociations = await db
      .select()
      .from(syncedMapMetas)
      .orderBy(asc(syncedMapMetas.mapId), asc(syncedMapMetas.syncedMetaId));

    expect(afterGroupSyncedAt).toEqual(baselineGroupSyncedAt);
    expect(afterMetas).toEqual(baselineMetas);
    expect(afterLocations).toEqual(baselineLocations);
    expect(afterAssociations).toEqual(baselineAssociations);
  });
});
