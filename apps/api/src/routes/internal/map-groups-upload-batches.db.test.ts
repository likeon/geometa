import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../../api';
import {
  mapGroupChanges,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metas,
  users,
} from '../../lib/db/schema';
import { db } from '../../lib/drizzle';

// The upload handler chunks its upsert into BATCH_SIZE = 1000-row INSERT
// statements. A duplicate split across statements never triggers PostgreSQL's
// same-statement cardinality violation: the later batch silently updates the
// row inserted by the earlier batch.
const BATCH_SIZE = 1000;
const DUPLICATE_MESSAGE =
  'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.';

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
function locationBody(panoId: string) {
  return {
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    panoId,
    extraTag: 'tag-a',
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
  // todo: the handler runs each 1000-row chunk as its own INSERT statement, so
  // a duplicate straddling the boundary (last row of batch 0, first row of
  // batch 1) never collides inside one statement. Batch 1's ON CONFLICT DO
  // UPDATE silently overwrites the row batch 0 inserted and the whole
  // transaction commits. Observed instead of the 409: a 200 with count 1001 /
  // conflictCount 0, a single merged pano-dup row, a created tag-a meta, and
  // a location_batch change entry. Cross-batch duplicates should surface as
  // the same 409 and roll back every batch atomically.
  test.todo('rejects a duplicate pano split across the 1000-row batch boundary with 409 and leaves the group untouched', async () => {
    const userId = 'batch-cross-owner';
    await db.insert(users).values({ id: userId, username: userId });
    const groupId = await seedOwnerGroup(userId, 'Cross-batch duplicate');

    // batch 0 = indices 0..999, batch 1 = index 1000; pano-dup sits on both
    // sides of the production chunk boundary
    const locations = distinctLocations(BATCH_SIZE);
    locations[BATCH_SIZE - 1] = locationBody('pano-dup');
    locations.push(locationBody('pano-dup'));
    expect(locations).toHaveLength(BATCH_SIZE + 1);

    const response = await uploadRequest(userId, groupId, {
      uploadMode: 'partial',
      locations,
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: DUPLICATE_MESSAGE });
    // atomic: no row, no meta, and no change-log entry survive the rollback
    expect(await groupState(groupId)).toEqual({
      locations: [],
      metas: [],
      changes: [],
    });
  });
});
