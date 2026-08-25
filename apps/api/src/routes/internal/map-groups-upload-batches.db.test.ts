import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  mapGroupChanges,
  mapGroupLocationMetas,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq } from 'drizzle-orm';

const BATCH_SIZE = 1000;

function uploadRequest(userId: string, groupId: number, body: unknown) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/map-groups/${groupId}/locations/upload`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-user-id': userId,
        },
        body: JSON.stringify(body),
      },
    ),
  );
}

async function seedOwnerGroup(userId: string, name: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  const groupId = group!.id;
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role: 'owner',
  });
  return groupId;
}

// minimal body accepted by the upload schema
function locationBody(panoId: string, extraTag = 'tag-a') {
  return {
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    panoId,
    extraTag,
    extraPanoId: null,
  };
}

function distinctLocations(count: number) {
  return Array.from({ length: count }, (_, i) => locationBody(`pano-${i}`));
}

async function groupState(groupId: number) {
  return {
    locations: await db
      .select({
        panoId: mapGroupLocations.panoId,
        extraTag: mapGroupLocations.extraTag,
      })
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.mapGroupId, groupId))
      .orderBy(mapGroupLocations.panoId),
    metas: await db
      .select({ tagName: metas.tagName })
      .from(metas)
      .where(eq(metas.mapGroupId, groupId))
      .orderBy(metas.tagName),
    changes: await db
      .select({
        entityType: mapGroupChanges.entityType,
        entityId: mapGroupChanges.entityId,
        entityLabel: mapGroupChanges.entityLabel,
        operation: mapGroupChanges.operation,
      })
      .from(mapGroupChanges)
      .where(eq(mapGroupChanges.mapGroupId, groupId))
      .orderBy(mapGroupChanges.id),
  };
}

describe('POST /api/internal/map-groups/:id/locations/upload duplicate panos across 1000-row batches', () => {
  test('merges a duplicate before chunking so behavior is independent of batch boundaries', async () => {
    const userId = 'batch-cross-owner';
    await db.insert(users).values({ id: userId, username: userId });
    const groupId = await seedOwnerGroup(userId, 'Cross-batch duplicate');

    const locations = distinctLocations(BATCH_SIZE);
    locations[BATCH_SIZE - 1] = { ...locationBody('pano-dup'), lat: 10 };
    locations.push({
      ...locationBody('pano-dup'),
      extraTag: 'tag-b',
      lat: 20,
    });
    expect(locations).toHaveLength(BATCH_SIZE + 1);

    const response = await uploadRequest(userId, groupId, {
      uploadMode: 'partial',
      locations,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: BATCH_SIZE,
      ignoredCount: 0,
    });

    const state = await groupState(groupId);
    expect(state.locations).toHaveLength(BATCH_SIZE);
    expect(state.metas).toEqual([{ tagName: 'tag-a' }, { tagName: 'tag-b' }]);
    expect(state.changes).toHaveLength(3);
    expect(
      state.changes.filter((change) => change.entityType === 'location_batch'),
    ).toEqual([
      expect.objectContaining({
        operation: 'update',
      }),
    ]);
    const [duplicate] = await db
      .select({ id: mapGroupLocations.id, lat: mapGroupLocations.lat })
      .from(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, groupId),
          eq(mapGroupLocations.panoId, 'pano-dup'),
        ),
      );
    expect(duplicate).toEqual(expect.objectContaining({ lat: 20 }));
    expect(
      (
        await db
          .select({ tagName: metas.tagName })
          .from(mapGroupLocationMetas)
          .innerJoin(metas, eq(metas.id, mapGroupLocationMetas.metaId))
          .where(eq(mapGroupLocationMetas.locationId, duplicate!.id))
          .orderBy(metas.tagName)
      ).map((row) => row.tagName),
    ).toEqual(['tag-a', 'tag-b']);
  });

  test('resolves links across meta lookup batches', async () => {
    const userId = 'batch-tags-owner';
    await db.insert(users).values({ id: userId, username: userId });
    const groupId = await seedOwnerGroup(userId, 'Cross-batch tags');
    const locations = Array.from({ length: BATCH_SIZE + 1 }, (_, i) =>
      locationBody(`tag-pano-${i}`, `tag-${i}`),
    );

    const response = await uploadRequest(userId, groupId, {
      uploadMode: 'partial',
      locations,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: BATCH_SIZE + 1,
      ignoredCount: 0,
    });
    expect(
      await db
        .select({ id: metas.id })
        .from(metas)
        .where(eq(metas.mapGroupId, groupId)),
    ).toHaveLength(BATCH_SIZE + 1);
    expect(
      await db
        .select({ locationId: mapGroupLocationMetas.locationId })
        .from(mapGroupLocationMetas)
        .where(eq(mapGroupLocationMetas.mapGroupId, groupId)),
    ).toHaveLength(BATCH_SIZE + 1);
  });
});
