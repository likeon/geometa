import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  levels,
  mapGroupChanges,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  metas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { eq } from 'drizzle-orm';

function deleteGroupRequest(userId: string, groupId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/map-groups/${groupId}`, {
      method: 'DELETE',
      headers: { 'x-api-user-id': userId },
    }),
  );
}

async function seedUser(id: string) {
  await db.insert(users).values({ id, username: id });
}

async function seedGroup(name: string, ownerId: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  const groupId = group!.id;
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId: ownerId,
    role: 'owner',
  });
  return groupId;
}

async function seedMember(groupId: number, userId: string) {
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role: 'editor',
  });
}

// Representative owned relations; deeper child-table cascades are covered by
// the schema invariant suite.
async function seedOwnedData(
  groupId: number,
  userId: string,
  suffix: string,
): Promise<void> {
  const [level] = await db
    .insert(levels)
    .values({ mapGroupId: groupId, name: `Level ${suffix}` })
    .returning({ id: levels.id });
  const levelId = level!.id;

  const [meta] = await db
    .insert(metas)
    .values({
      mapGroupId: groupId,
      tagName: `tag-${suffix}`,
      name: `Meta ${suffix}`,
      note: `note ${suffix}`,
      modifiedAt: 100,
    })
    .returning({ id: metas.id });
  const metaId = meta!.id;

  await db.insert(maps).values({
    mapGroupId: groupId,
    name: `Map ${suffix}`,
    geoguessrId: `geoguessr-${suffix}`,
  });

  await db.insert(mapGroupLocations).values({
    mapGroupId: groupId,
    panoId: `pano-${suffix}`,
    extraTag: `tag-${suffix}`,
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    updatedAt: 100,
  });

  await db.insert(syncedMetas).values({
    metaId,
    mapGroupId: groupId,
    name: `Synced ${suffix}`,
    note: `note ${suffix}`,
    noteFromPlonkit: false,
    footer: '',
    images: [],
  });
  await db.insert(mapGroupChanges).values({
    mapGroupId: groupId,
    userId,
    entityType: 'level',
    entityId: levelId,
    entityLabel: `Level ${suffix}`,
    operation: 'create',
    newValue: { name: `Level ${suffix}` },
    createdAt: 100,
  });
  await db.insert(mapGroupChanges).values({
    mapGroupId: groupId,
    userId,
    entityType: 'sync',
    entityId: groupId,
    entityLabel: 'changes published',
    operation: 'update',
    createdAt: 200,
  });
}

async function ownedSnapshot(groupId: number) {
  return {
    group: await db.select().from(mapGroups).where(eq(mapGroups.id, groupId)),
    levels: await db
      .select()
      .from(levels)
      .where(eq(levels.mapGroupId, groupId)),
    metas: await db.select().from(metas).where(eq(metas.mapGroupId, groupId)),
    maps: await db.select().from(maps).where(eq(maps.mapGroupId, groupId)),
    locations: await db
      .select()
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.mapGroupId, groupId)),
    permissions: await db
      .select()
      .from(mapGroupPermissions)
      .where(eq(mapGroupPermissions.mapGroupId, groupId)),
    syncedMetas: await db
      .select()
      .from(syncedMetas)
      .where(eq(syncedMetas.mapGroupId, groupId)),
    changes: await db
      .select()
      .from(mapGroupChanges)
      .where(eq(mapGroupChanges.mapGroupId, groupId)),
  };
}

describe('DELETE /api/internal/map-groups/:id', () => {
  test('owner delete returns 200, cascades owned data, and preserves an unrelated group', async () => {
    await seedUser('del-owner-1');
    await seedUser('del-editor-1');
    const groupId = await seedGroup('Doomed group', 'del-owner-1');
    await seedMember(groupId, 'del-editor-1');
    await seedOwnedData(groupId, 'del-owner-1', 'doomed');

    const survivorGroupId = await seedGroup('Survivor group', 'del-owner-1');
    await seedOwnedData(survivorGroupId, 'del-owner-1', 'survivor');
    const survivorBefore = await ownedSnapshot(survivorGroupId);
    expect(survivorBefore.group).toHaveLength(1);

    const response = await deleteGroupRequest('del-owner-1', groupId);

    expect(response.status).toBe(200);
    // every owned relation is cascaded away, including permissions, synced
    // rows, and audit entries
    expect(await ownedSnapshot(groupId)).toEqual({
      group: [],
      levels: [],
      metas: [],
      maps: [],
      locations: [],
      permissions: [],
      syncedMetas: [],
      changes: [],
    });
    // the unrelated group and all of its data are untouched
    expect(await ownedSnapshot(survivorGroupId)).toEqual(survivorBefore);
  });

  test('editor delete is denied and leaves every owned row unchanged', async () => {
    await seedUser('del-owner-2');
    await seedUser('del-editor-2');
    const groupId = await seedGroup('Editor protected group', 'del-owner-2');
    await seedMember(groupId, 'del-editor-2');
    await seedOwnedData(groupId, 'del-owner-2', 'editor');

    const before = await ownedSnapshot(groupId);
    expect(before.group).toHaveLength(1);

    const response = await deleteGroupRequest('del-editor-2', groupId);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual([
      "You don't have permissions for this",
    ]);
    expect(await ownedSnapshot(groupId)).toEqual(before);
  });
});
