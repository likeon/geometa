import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  mapGroupChanges,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  metas,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, inArray } from 'drizzle-orm';

const syncedAt = 1700000000;

async function seedUser(id: string, isSuperadmin = false) {
  await db.insert(users).values({ id, username: id, isSuperadmin });
}

async function seedMember(
  groupId: number,
  userId: string,
  role: 'owner' | 'editor' = 'editor',
) {
  const [permission] = await db
    .insert(mapGroupPermissions)
    .values({ mapGroupId: groupId, userId, role })
    .returning({ id: mapGroupPermissions.id });
  return permission!.id;
}

async function getPermission(groupId: number, userId: string) {
  const [row] = await db
    .select()
    .from(mapGroupPermissions)
    .where(
      and(
        eq(mapGroupPermissions.mapGroupId, groupId),
        eq(mapGroupPermissions.userId, userId),
      ),
    );
  return row;
}

async function permissionSnapshot(groupId: number) {
  return db
    .select({
      id: mapGroupPermissions.id,
      userId: mapGroupPermissions.userId,
      role: mapGroupPermissions.role,
    })
    .from(mapGroupPermissions)
    .where(eq(mapGroupPermissions.mapGroupId, groupId))
    .orderBy(mapGroupPermissions.id);
}

async function seedOwnerGroup(
  userId: string,
  name: string,
  settings: {
    syncedAt: number | null;
    syncIncludeLocationsNotOnStreetView: boolean;
  },
) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name, ...settings })
    .returning({ id: mapGroups.id });
  const groupId = group!.id;
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role: 'owner',
  });
  return groupId;
}

async function getGroup(groupId: number) {
  const [row] = await db
    .select({
      syncedAt: mapGroups.syncedAt,
      syncIncludeLocationsNotOnStreetView:
        mapGroups.syncIncludeLocationsNotOnStreetView,
    })
    .from(mapGroups)
    .where(eq(mapGroups.id, groupId));
  return row!;
}

async function getSettingsLogs(groupId: number) {
  return db
    .select({
      mapGroupId: mapGroupChanges.mapGroupId,
      userId: mapGroupChanges.userId,
      entityType: mapGroupChanges.entityType,
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
      createdAt: mapGroupChanges.createdAt,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'settings'),
      ),
    )
    .orderBy(mapGroupChanges.id);
}

function settingsRequest(userId: string, groupId: number, body: unknown) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/map-groups/${groupId}/settings`,
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

function addPermissionRequest(userId: string, groupId: number, body: unknown) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/map-groups/${groupId}/permissions`,
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

function updatePermissionRequest(
  userId: string,
  groupId: number,
  permissionId: number,
  body: unknown,
) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/map-groups/${groupId}/permissions/${permissionId}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-api-user-id': userId,
        },
        body: JSON.stringify(body),
      },
    ),
  );
}

function deletePermissionRequest(
  userId: string,
  groupId: number,
  permissionId: number,
) {
  return app.handle(
    new Request(
      `http://localhost/api/internal/map-groups/${groupId}/permissions/${permissionId}`,
      {
        method: 'DELETE',
        headers: { 'x-api-user-id': userId },
      },
    ),
  );
}

// number of sessions blocked waiting on the group's permission-row FOR UPDATE
// lock, i.e. transactions stuck in the last-owner guard
async function blockedLockWaiterCount() {
  const rows = await db.$primary.$client`
    SELECT count(*)::int AS blocked
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active'
      AND wait_event_type = 'Lock'
      AND query ILIKE '%map_group_permissions%'
      AND query ILIKE '%for update%'
      AND pid <> pg_backend_pid()
  `;
  return Number(rows[0]?.blocked ?? 0);
}

// condition polling (event-loop yields only, no fixed sleeps) until the given
// number of transactions are blocked on the last-owner lock
async function waitForBlockedLockWaiters(count: number, deadlineMs = 10_000) {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    const blocked = await blockedLockWaiterCount();
    if (blocked >= count) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `timed out after ${deadlineMs}ms waiting for ${count} permission transactions to block on the last-owner lock (blocked=${blocked})`,
      );
    }
    await Bun.sleep(0);
  }
}

function locationUploadRequest(userId: string, groupId: number, body: unknown) {
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

// seeded before an upload so the row is not part of the current batch and its
// stale updatedAt exposes it to full/tagReplace deletion
async function seedLocation(groupId: number, panoId: string, extraTag: string) {
  await db.insert(mapGroupLocations).values({
    mapGroupId: groupId,
    panoId,
    extraTag,
    lat: 1,
    lng: 2,
    heading: 3,
    pitch: 4,
    zoom: 5,
    updatedAt: syncedAt,
  });
}

function locationBody(panoId: string, extraTag: string) {
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

async function locationSnapshot(groupId: number) {
  return db
    .select({
      panoId: mapGroupLocations.panoId,
      extraTag: mapGroupLocations.extraTag,
      extraPanoId: mapGroupLocations.extraPanoId,
    })
    .from(mapGroupLocations)
    .where(eq(mapGroupLocations.mapGroupId, groupId))
    .orderBy(mapGroupLocations.panoId);
}

describe('POST /api/internal/map-groups/:id/settings', () => {
  test('no-op save preserves syncedAt and adds no audit log', async () => {
    await seedUser('owner-1');
    const groupId = await seedOwnerGroup('owner-1', 'No-op group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const response = await settingsRequest('owner-1', groupId, {
      syncIncludeLocationsNotOnStreetView: true,
    });

    expect(response.status).toBe(200);
    // identical value: row untouched, sync state intact
    expect(await getGroup(groupId)).toEqual({
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    expect(await getSettingsLogs(groupId)).toEqual([]);
  });

  test('changed explicit false persists, resets syncedAt, and writes exact log', async () => {
    await seedUser('owner-1');
    const groupId = await seedOwnerGroup('owner-1', 'False transition', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const response = await settingsRequest('owner-1', groupId, {
      syncIncludeLocationsNotOnStreetView: false,
    });

    expect(response.status).toBe(200);
    // explicit false is a real value, not an omission marker
    expect(await getGroup(groupId)).toEqual({
      syncedAt: null,
      syncIncludeLocationsNotOnStreetView: false,
    });
    expect(await getSettingsLogs(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'settings',
        entityId: groupId,
        entityLabel: null,
        operation: 'update',
        oldValue: { syncIncludeLocationsNotOnStreetView: true },
        newValue: { syncIncludeLocationsNotOnStreetView: false },
        createdAt: expect.any(Number),
      },
    ]);
  });

  test('changed explicit true persists, resets syncedAt, and writes exact log', async () => {
    await seedUser('owner-1');
    const groupId = await seedOwnerGroup('owner-1', 'True transition', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: false,
    });

    const response = await settingsRequest('owner-1', groupId, {
      syncIncludeLocationsNotOnStreetView: true,
    });

    expect(response.status).toBe(200);
    expect(await getGroup(groupId)).toEqual({
      syncedAt: null,
      syncIncludeLocationsNotOnStreetView: true,
    });
    expect(await getSettingsLogs(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'settings',
        entityId: groupId,
        entityLabel: null,
        operation: 'update',
        oldValue: { syncIncludeLocationsNotOnStreetView: false },
        newValue: { syncIncludeLocationsNotOnStreetView: true },
        createdAt: expect.any(Number),
      },
    ]);
  });
});

describe('permission management', () => {
  test('POST adds a member with the default editor role', async () => {
    await seedUser('perm-owner-1');
    await seedUser('perm-member-1');
    const groupId = await seedOwnerGroup('perm-owner-1', 'Add default group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const response = await addPermissionRequest('perm-owner-1', groupId, {
      username: 'perm-member-1',
    });

    expect(response.status).toBe(200);
    // role is optional on the request and defaults to editor
    expect(await getPermission(groupId, 'perm-member-1')).toEqual(
      expect.objectContaining({ userId: 'perm-member-1', role: 'editor' }),
    );
  });

  test('PATCH promotes an editor to owner', async () => {
    await seedUser('perm-owner-6');
    await seedUser('perm-editor-6');
    const groupId = await seedOwnerGroup('perm-owner-6', 'Promote group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedMember(groupId, 'perm-editor-6');

    const response = await updatePermissionRequest(
      'perm-owner-6',
      groupId,
      (await getPermission(groupId, 'perm-editor-6'))!.id,
      { role: 'owner' },
    );

    expect(response.status).toBe(200);
    expect(await getPermission(groupId, 'perm-editor-6')).toEqual(
      expect.objectContaining({ userId: 'perm-editor-6', role: 'owner' }),
    );
  });

  test('PATCH rejects changing your own role', async () => {
    await seedUser('perm-owner-7');
    const groupId = await seedOwnerGroup('perm-owner-7', 'Self-change group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const before = await permissionSnapshot(groupId);
    const response = await updatePermissionRequest(
      'perm-owner-7',
      groupId,
      (await getPermission(groupId, 'perm-owner-7'))!.id,
      { role: 'editor' },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: "Can't change your own role",
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
  });

  test('PATCH rejects demoting the last owner', async () => {
    await seedUser('perm-owner-8');
    await seedUser('perm-admin-8', true);
    const groupId = await seedOwnerGroup('perm-owner-8', 'Last-owner group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const before = await permissionSnapshot(groupId);
    // superadmin acts as owner without holding a permission row, so the sole
    // owner row is the last owner and cannot be demoted
    const response = await updatePermissionRequest(
      'perm-admin-8',
      groupId,
      (await getPermission(groupId, 'perm-owner-8'))!.id,
      { role: 'editor' },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: 'A group must keep at least one owner',
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
  });

  test('PATCH rejects a permission id belonging to another group', async () => {
    await seedUser('perm-owner-9');
    await seedUser('perm-foreign-9');
    const groupId = await seedOwnerGroup('perm-owner-9', 'Own group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    const otherGroupId = await seedOwnerGroup('perm-owner-9', 'Other group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedMember(otherGroupId, 'perm-foreign-9');

    const before = await permissionSnapshot(groupId);
    const response = await updatePermissionRequest(
      'perm-owner-9',
      groupId,
      (await getPermission(otherGroupId, 'perm-foreign-9'))!.id,
      { role: 'owner' },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: 'Permission not found',
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
    // the foreign group's permission is untouched as well
    expect(await getPermission(otherGroupId, 'perm-foreign-9')).toEqual(
      expect.objectContaining({ role: 'editor' }),
    );
  });

  test('DELETE removes a member from the group', async () => {
    await seedUser('perm-owner-11');
    await seedUser('perm-member-11');
    const groupId = await seedOwnerGroup('perm-owner-11', 'Delete member', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    const memberPermissionId = await seedMember(groupId, 'perm-member-11');

    const response = await deletePermissionRequest(
      'perm-owner-11',
      groupId,
      memberPermissionId,
    );

    expect(response.status).toBe(200);
    expect(await getPermission(groupId, 'perm-member-11')).toBeUndefined();
  });

  test('DELETE rejects stripping your own permissions', async () => {
    await seedUser('perm-owner-12');
    const groupId = await seedOwnerGroup('perm-owner-12', 'Self-strip group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const before = await permissionSnapshot(groupId);
    const response = await deletePermissionRequest(
      'perm-owner-12',
      groupId,
      (await getPermission(groupId, 'perm-owner-12'))!.id,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: "Can't strip your own permissions",
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
  });

  test('DELETE rejects removing the last owner', async () => {
    await seedUser('perm-owner-13');
    await seedUser('perm-admin-13', true);
    const groupId = await seedOwnerGroup('perm-owner-13', 'Last-owner delete', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const before = await permissionSnapshot(groupId);
    const response = await deletePermissionRequest(
      'perm-admin-13',
      groupId,
      (await getPermission(groupId, 'perm-owner-13'))!.id,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: 'A group must keep at least one owner',
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
  });

  test('DELETE rejects a permission id belonging to another group', async () => {
    await seedUser('perm-owner-14');
    await seedUser('perm-foreign-14');
    const groupId = await seedOwnerGroup('perm-owner-14', 'Own delete group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    const otherGroupId = await seedOwnerGroup('perm-owner-14', 'Other delete', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    const foreignPermissionId = await seedMember(
      otherGroupId,
      'perm-foreign-14',
    );

    const before = await permissionSnapshot(groupId);
    const response = await deletePermissionRequest(
      'perm-owner-14',
      groupId,
      foreignPermissionId,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      field: 'permissionId',
      message: 'Permission not found',
    });
    expect(await permissionSnapshot(groupId)).toEqual(before);
    expect(await getPermission(otherGroupId, 'perm-foreign-14')).toBeDefined();
  });
});

describe('concurrent last-owner demotion and removal', () => {
  test('racing DELETE and PATCH demote cannot leave a group ownerless', async () => {
    await seedUser('race-admin', true);
    await seedUser('race-owner-a');
    await seedUser('race-owner-b');
    const groupId = await seedOwnerGroup('race-owner-a', 'Race group', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedMember(groupId, 'race-owner-b', 'owner');
    const ownerA = (await getPermission(groupId, 'race-owner-a'))!;
    const ownerB = (await getPermission(groupId, 'race-owner-b'))!;

    // hold the group's permission-row locks so both requests' guard
    // transactions are guaranteed to be in flight before either can commit
    let lockAcquired!: () => void;
    const lockAcquiredPromise = new Promise<void>((resolve) => {
      lockAcquired = resolve;
    });
    let releaseLock!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const lockHolder = db.$primary.transaction(async (tx) => {
      await tx
        .select()
        .from(mapGroupPermissions)
        .where(eq(mapGroupPermissions.mapGroupId, groupId))
        .for('update');
      lockAcquired();
      await gate;
    });
    await lockAcquiredPromise;

    const requests = Promise.allSettled([
      deletePermissionRequest('race-admin', groupId, ownerA.id),
      updatePermissionRequest('race-admin', groupId, ownerB.id, {
        role: 'editor',
      }),
    ]);

    // deterministically wait until both requests are blocked on the row lock
    await waitForBlockedLockWaiters(2);

    releaseLock();
    await lockHolder;

    const results = await requests;
    expect(results).toHaveLength(2);
    const statuses = results
      .map((result) =>
        result.status === 'fulfilled' ? result.value.status : -1,
      )
      .sort();
    // exactly one removal/demotion wins; the loser is rejected by the
    // last-owner guard regardless of which request wins
    expect(statuses).toEqual([200, 400]);
    const deleteWon =
      results[0].status === 'fulfilled' && results[0].value.status === 200;
    const losers = results.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 400,
    );
    expect(losers).toHaveLength(1);
    const loser = losers[0] as PromiseFulfilledResult<Response>;
    expect(await loser.value.json()).toEqual({
      field: 'permissionId',
      message: 'A group must keep at least one owner',
    });

    // final invariant: exactly one owner survives, and the non-surviving
    // owner is either removed (delete won) or demoted to editor (demote won)
    const finalPermissions = await permissionSnapshot(groupId);
    const owners = finalPermissions.filter((p) => p.role === 'owner');
    expect(owners).toHaveLength(1);
    if (deleteWon) {
      expect(owners[0].userId).toBe('race-owner-b');
      expect(await getPermission(groupId, 'race-owner-a')).toBeUndefined();
    } else {
      expect(owners[0].userId).toBe('race-owner-a');
      expect(await getPermission(groupId, 'race-owner-b')).toEqual(
        expect.objectContaining({ role: 'editor' }),
      );
    }
  });
});

describe('location upload deletion semantics', () => {
  test('partial upload preserves omitted rows', async () => {
    await seedUser('upload-owner-1');
    const groupId = await seedOwnerGroup('upload-owner-1', 'Partial upload', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedLocation(groupId, 'pano-a', 'tag-a');
    await seedLocation(groupId, 'pano-b', 'tag-b');

    const response = await locationUploadRequest('upload-owner-1', groupId, {
      uploadMode: 'partial',
      locations: [locationBody('pano-a', 'tag-a')],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 1,
      ignoredCount: 0,
      conflictCount: 0,
    });
    // only pano-a is upserted; the omitted pano-b row survives untouched
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'pano-a', extraTag: 'tag-a', extraPanoId: null },
      { panoId: 'pano-b', extraTag: 'tag-b', extraPanoId: null },
    ]);
  });

  test('full upload removes all omitted rows', async () => {
    await seedUser('upload-owner-2');
    const groupId = await seedOwnerGroup('upload-owner-2', 'Full upload', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedLocation(groupId, 'pano-a', 'tag-a');
    await seedLocation(groupId, 'pano-b', 'tag-b');

    const response = await locationUploadRequest('upload-owner-2', groupId, {
      uploadMode: 'full',
      locations: [locationBody('pano-a', 'tag-a')],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 1,
      ignoredCount: 0,
      conflictCount: 0,
    });
    // every row not in the upload is deleted, regardless of tag
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'pano-a', extraTag: 'tag-a', extraPanoId: null },
    ]);
  });

  test('empty full upload deletes all rows; empty partial upload is a no-op', async () => {
    await seedUser('upload-owner-4');
    const groupId = await seedOwnerGroup('upload-owner-4', 'Empty uploads', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedLocation(groupId, 'pano-a', 'tag-a');
    await seedLocation(groupId, 'pano-b', 'tag-b');
    // an unrelated group's row proves deletions stay scoped to this group
    const otherGroupId = await seedOwnerGroup(
      'upload-owner-4',
      'Empty upload other',
      {
        syncedAt,
        syncIncludeLocationsNotOnStreetView: true,
      },
    );
    await seedLocation(otherGroupId, 'pano-c', 'tag-a');

    const partial = await locationUploadRequest('upload-owner-4', groupId, {
      uploadMode: 'partial',
      locations: [],
    });
    expect(partial.status).toBe(200);
    expect(await partial.json()).toEqual({
      count: 0,
      ignoredCount: 0,
      conflictCount: 0,
    });
    // empty partial upload is a no-op: every row survives untouched
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'pano-a', extraTag: 'tag-a', extraPanoId: null },
      { panoId: 'pano-b', extraTag: 'tag-b', extraPanoId: null },
    ]);

    const full = await locationUploadRequest('upload-owner-4', groupId, {
      uploadMode: 'full',
      locations: [],
    });
    expect(full.status).toBe(200);
    expect(await full.json()).toEqual({
      count: 0,
      ignoredCount: 0,
      conflictCount: 0,
    });
    // empty full upload replaces the group with nothing: all rows deleted
    expect(await locationSnapshot(groupId)).toEqual([]);
    // the unrelated group is untouched by both uploads
    expect(await locationSnapshot(otherGroupId)).toEqual([
      { panoId: 'pano-c', extraTag: 'tag-a', extraPanoId: null },
    ]);
  });

  test('tagReplace upload removes only omitted rows in replaced tags', async () => {
    await seedUser('upload-owner-3');
    const groupId = await seedOwnerGroup('upload-owner-3', 'Tag replace', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    await seedLocation(groupId, 'pano-a', 'tag-a');
    await seedLocation(groupId, 'pano-b', 'tag-b');
    // same-tag row in another group proves deletion stays in this group
    const otherGroupId = await seedOwnerGroup(
      'upload-owner-3',
      'Other upload',
      {
        syncedAt,
        syncIncludeLocationsNotOnStreetView: true,
      },
    );
    await seedLocation(otherGroupId, 'pano-c', 'tag-a');

    const response = await locationUploadRequest('upload-owner-3', groupId, {
      uploadMode: 'tagReplace',
      locations: [locationBody('pano-x', 'tag-a')],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 1,
      ignoredCount: 0,
      conflictCount: 0,
    });
    // omitted tag-a row is deleted, omitted tag-b row is preserved, and the
    // newly uploaded pano-x survives
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'pano-b', extraTag: 'tag-b', extraPanoId: null },
      { panoId: 'pano-x', extraTag: 'tag-a', extraPanoId: null },
    ]);
    // the other group's same-tag row is untouched
    expect(await locationSnapshot(otherGroupId)).toEqual([
      { panoId: 'pano-c', extraTag: 'tag-a', extraPanoId: null },
    ]);
  });
});

describe('location upload editor scope and scoped semantics', () => {
  test('editor must scope to a meta and cannot use full mode', async () => {
    await seedUser('scope-editor-owner-1');
    await seedUser('scope-editor-1');
    const groupId = await seedOwnerGroup(
      'scope-editor-owner-1',
      'Editor scope',
      {
        syncedAt,
        syncIncludeLocationsNotOnStreetView: true,
      },
    );
    await seedMember(groupId, 'scope-editor-1');

    const before = await locationSnapshot(groupId);

    const unscoped = await locationUploadRequest('scope-editor-1', groupId, {
      uploadMode: 'partial',
      locations: [locationBody('pano-e', 'tag-a')],
    });
    expect(unscoped.status).toBe(403);
    expect(await unscoped.json()).toEqual({
      message: 'Editors can only upload locations for a specific meta',
    });

    const fullScoped = await locationUploadRequest('scope-editor-1', groupId, {
      uploadMode: 'full',
      scopeTag: 'tag-a',
      locations: [locationBody('pano-e', 'tag-a')],
    });
    expect(fullScoped.status).toBe(403);
    expect(await fullScoped.json()).toEqual({
      message: 'Editors cannot replace all locations in a group',
    });

    // neither denial touched the group's locations
    expect(await locationSnapshot(groupId)).toEqual(before);
  });

  test('scoped tagReplace ignores out-of-scope rows and conflicts on panos owned by another tag', async () => {
    await seedUser('scope-editor-owner-2');
    await seedUser('scope-editor-2');
    const groupId = await seedOwnerGroup(
      'scope-editor-owner-2',
      'Scoped upload',
      {
        syncedAt,
        syncIncludeLocationsNotOnStreetView: true,
      },
    );
    await seedMember(groupId, 'scope-editor-2');
    // the scoped tag must already exist as a meta in the group
    await db.insert(metas).values({
      mapGroupId: groupId,
      tagName: 'tag-a',
      name: 'Tag A',
      note: '',
      modifiedAt: syncedAt,
    });
    // pano-a already belongs to tag-b; re-uploading it under tag-a must
    // conflict and leave the existing row untouched
    await seedLocation(groupId, 'pano-a', 'tag-b');

    const response = await locationUploadRequest('scope-editor-2', groupId, {
      uploadMode: 'tagReplace',
      scopeTag: 'tag-a',
      locations: [
        locationBody('pano-a', 'tag-a'),
        locationBody('pano-x', 'tag-a'),
        locationBody('pano-z', 'tag-b'),
      ],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 1,
      ignoredCount: 1,
      conflictCount: 1,
    });
    // pano-a stays on tag-b, pano-x is inserted, and the out-of-scope pano-z
    // is neither inserted nor deleted (tag-b rows are untouched)
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'pano-a', extraTag: 'tag-b', extraPanoId: null },
      { panoId: 'pano-x', extraTag: 'tag-a', extraPanoId: null },
    ]);
  });
});

describe('location upload duplicate pano rollback', () => {
  test('same-batch duplicate pano returns 409 and rolls back earlier upsert and delete work', async () => {
    await seedUser('dup-owner-1');
    const groupId = await seedOwnerGroup('dup-owner-1', 'Duplicate rollback', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });
    // stale updatedAt marks these as victims of the full upload's delete step
    await seedLocation(groupId, 'dup-seed-a', 'tag-seed-a');
    await seedLocation(groupId, 'dup-seed-b', 'tag-seed-b');

    // a full batch (BATCH_SIZE = 1000) of genuine new upserts first, then the
    // duplicate pano pair in the following batch, so the 21000 cardinality
    // error fires only after real work happened inside the transaction
    const locations = Array.from({ length: 1000 }, (_, i) =>
      locationBody(`pano-batch-${i}`, 'tag-upload'),
    );
    locations.push(locationBody('dup-pano', 'tag-upload'));
    locations.push(locationBody('dup-pano', 'tag-upload'));

    const response = await locationUploadRequest('dup-owner-1', groupId, {
      uploadMode: 'full',
      locations,
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.',
    });
    // neither the batch-1 upserts nor the full-replacement delete survived:
    // only the seeded rows remain, untouched
    expect(await locationSnapshot(groupId)).toEqual([
      { panoId: 'dup-seed-a', extraTag: 'tag-seed-a', extraPanoId: null },
      { panoId: 'dup-seed-b', extraTag: 'tag-seed-b', extraPanoId: null },
    ]);
    // the rolled-back upsert did not even stamp the seeded rows' timestamps
    const remaining = await db
      .select({
        panoId: mapGroupLocations.panoId,
        updatedAt: mapGroupLocations.updatedAt,
      })
      .from(mapGroupLocations)
      .where(eq(mapGroupLocations.mapGroupId, groupId))
      .orderBy(mapGroupLocations.panoId);
    expect(remaining).toEqual([
      { panoId: 'dup-seed-a', updatedAt: syncedAt },
      { panoId: 'dup-seed-b', updatedAt: syncedAt },
    ]);
    // the auto-created meta and the location_batch/meta audit logs are gone too
    expect(
      await db
        .select({ id: metas.id })
        .from(metas)
        .where(eq(metas.mapGroupId, groupId)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: mapGroupChanges.id })
        .from(mapGroupChanges)
        .where(eq(mapGroupChanges.mapGroupId, groupId)),
    ).toEqual([]);
  });
});

async function getUploadLogs(groupId: number) {
  return db
    .select({
      mapGroupId: mapGroupChanges.mapGroupId,
      userId: mapGroupChanges.userId,
      entityType: mapGroupChanges.entityType,
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
      createdAt: mapGroupChanges.createdAt,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        inArray(mapGroupChanges.entityType, ['location_batch', 'meta']),
      ),
    )
    .orderBy(mapGroupChanges.id);
}

describe('location upload unscoped meta auto-creation', () => {
  test('new tag creates an empty meta and exact audit entries; re-uploading the existing tag adds no duplicate meta or create entry', async () => {
    await seedUser('upload-owner-5');
    const groupId = await seedOwnerGroup('upload-owner-5', 'Unscoped new tag', {
      syncedAt,
      syncIncludeLocationsNotOnStreetView: true,
    });

    const before = Math.floor(Date.now() / 1000);
    const response = await locationUploadRequest('upload-owner-5', groupId, {
      uploadMode: 'partial',
      locations: [locationBody('pano-new', 'tag-new')],
    });
    const after = Math.floor(Date.now() / 1000);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 1,
      ignoredCount: 0,
      conflictCount: 0,
    });

    // the unseen tag is auto-created as an empty meta row
    const [meta] = await db
      .select()
      .from(metas)
      .where(and(eq(metas.mapGroupId, groupId), eq(metas.tagName, 'tag-new')));
    expect(meta).toEqual(
      expect.objectContaining({
        mapGroupId: groupId,
        tagName: 'tag-new',
        name: '',
        note: '',
        noteHtml: '',
        footer: '',
        footerHtml: '',
        noteFromPlonkit: false,
        hasImage: false,
      }),
    );
    expect(meta!.modifiedAt).toBeGreaterThanOrEqual(before);
    expect(meta!.modifiedAt).toBeLessThanOrEqual(after);

    // exact audit snapshot: the batch marker plus the meta create entry
    expect(await getUploadLogs(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'upload-owner-5',
        entityType: 'location_batch',
        entityId: null,
        entityLabel: '1 tags',
        operation: 'update',
        oldValue: null,
        newValue: {
          uploadMode: 'partial',
          count: 1,
          deletedCount: 0,
          ignoredCount: 0,
          conflictCount: 0,
          tags: ['tag-new'],
        },
        createdAt: expect.any(Number),
      },
      {
        mapGroupId: groupId,
        userId: 'upload-owner-5',
        entityType: 'meta',
        entityId: meta!.id,
        entityLabel: 'tag-new',
        operation: 'create',
        oldValue: null,
        newValue: { tagName: 'tag-new', createdByLocationUpload: true },
        createdAt: expect.any(Number),
      },
    ]);

    // existing-tag distinction: re-uploading the same tag only upserts
    // locations; no second meta row and no second meta create entry
    const second = await locationUploadRequest('upload-owner-5', groupId, {
      uploadMode: 'partial',
      locations: [locationBody('pano-new-2', 'tag-new')],
    });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      count: 1,
      ignoredCount: 0,
      conflictCount: 0,
    });

    expect(
      await db
        .select({ id: metas.id })
        .from(metas)
        .where(eq(metas.mapGroupId, groupId)),
    ).toHaveLength(1);
    // the create entry stays the only meta entry; the second upload only
    // appends its own location_batch marker
    const logs = await getUploadLogs(groupId);
    expect(logs.filter((log) => log.entityType === 'meta')).toHaveLength(1);
    expect(logs).toHaveLength(3);
  });
});

function syncRequest(userId: string, groupId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/map-groups/${groupId}/sync`, {
      method: 'POST',
      headers: { 'x-api-user-id': userId },
    }),
  );
}

async function getSyncMarkers(groupId: number) {
  return db
    .select({
      mapGroupId: mapGroupChanges.mapGroupId,
      userId: mapGroupChanges.userId,
      entityType: mapGroupChanges.entityType,
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
      createdAt: mapGroupChanges.createdAt,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'sync'),
      ),
    )
    .orderBy(mapGroupChanges.id);
}

async function seedSyncFixture(
  userId: string,
  groupName: string,
  geoguessrId: string,
) {
  const groupId = await seedOwnerGroup(userId, groupName, {
    syncedAt: null,
    syncIncludeLocationsNotOnStreetView: true,
  });
  const [meta] = await db
    .insert(metas)
    .values({
      mapGroupId: groupId,
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      noteHtml: '<p><strong>Capital:</strong> Washington</p>',
      footer: '',
      footerHtml: '',
      noteFromPlonkit: true,
      modifiedAt: 100,
    })
    .returning({ id: metas.id });
  await seedLocation(groupId, 'pano-sync', 'us');
  const [map] = await db
    .insert(maps)
    .values({ mapGroupId: groupId, name: 'Sync map', geoguessrId })
    .returning({ id: maps.id });
  return { groupId, metaId: meta!.id, mapId: map!.id };
}

describe('POST /api/internal/map-groups/:id/sync', () => {
  test('owner sync persists synced rows, advances the group timestamp, and writes the exact sync marker', async () => {
    await seedUser('sync-owner-1');
    const { groupId, metaId, mapId } = await seedSyncFixture(
      'sync-owner-1',
      'Sync owner group',
      'sync-owner-map',
    );

    const before = Math.floor(Date.now() / 1000);
    const response = await syncRequest('sync-owner-1', groupId);
    const after = Math.floor(Date.now() / 1000);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hasMapUpdates: true,
      mapUpdatesCount: 1,
    });

    // the source meta is mirrored into the synced tables with its exact
    // rendered payload
    expect(await db.select().from(syncedMetas)).toEqual([
      {
        metaId,
        mapGroupId: groupId,
        name: 'United States',
        note: '<p><strong>Capital:</strong> Washington</p>',
        noteFromPlonkit: true,
        footer: '',
        images: [],
      },
    ]);
    expect(await db.select().from(syncedLocations)).toEqual([
      {
        syncedMetaId: metaId,
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
        panoId: 'pano-sync',
        extraTag: 'us',
        extraPanoId: null,
        extraPanoDate: null,
        country: 'us',
      },
    ]);
    expect(await db.select().from(syncedMapMetas)).toEqual([
      { mapId, syncedMetaId: metaId },
    ]);

    // the group timestamp advanced to the sync's own second
    const [group] = await db
      .select({ syncedAt: mapGroups.syncedAt })
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    const syncedTimestamp = group!.syncedAt!;
    expect(syncedTimestamp).toBeGreaterThanOrEqual(before);
    expect(syncedTimestamp).toBeLessThanOrEqual(after);

    // the value-less sync marker is stamped with the same timestamp so it sits
    // exactly on the synced/unsynced boundary instead of classifying itself
    // unsynced
    expect(await getSyncMarkers(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'sync-owner-1',
        entityType: 'sync',
        entityId: groupId,
        entityLabel: 'changes published',
        operation: 'update',
        oldValue: null,
        newValue: null,
        createdAt: syncedTimestamp,
      },
    ]);
  });

  test('does not advertise map updates for a group without maps', async () => {
    await seedUser('sync-mapless-owner');
    const groupId = await seedOwnerGroup(
      'sync-mapless-owner',
      'Mapless group',
      { syncedAt: null, syncIncludeLocationsNotOnStreetView: true },
    );

    const response = await syncRequest('sync-mapless-owner', groupId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hasMapUpdates: false,
      mapUpdatesCount: 0,
    });
  });

  test('returns the number of maps whose managed locations changed', async () => {
    await seedUser('sync-map-count-owner');
    const { groupId } = await seedSyncFixture(
      'sync-map-count-owner',
      'Map count group',
      'sync-map-count-one',
    );
    await db.insert(maps).values({
      mapGroupId: groupId,
      name: 'Second sync map',
      geoguessrId: 'sync-map-count-two',
    });

    const response = await syncRequest('sync-map-count-owner', groupId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hasMapUpdates: true,
      mapUpdatesCount: 2,
    });
  });

  test('ignores meta-only syncs but advertises managed location changes', async () => {
    await seedUser('sync-change-owner');
    const { groupId, metaId } = await seedSyncFixture(
      'sync-change-owner',
      'Changed locations group',
      'changed-locations-map',
    );
    await syncRequest('sync-change-owner', groupId);
    const firstGroup = await getGroup(groupId);

    await db
      .update(metas)
      .set({
        note: 'Changed note only',
        noteHtml: '<p>Changed note only</p>',
        modifiedAt: firstGroup.syncedAt! + 1,
      })
      .where(eq(metas.id, metaId));
    const metaOnlyResponse = await syncRequest('sync-change-owner', groupId);

    expect(metaOnlyResponse.status).toBe(200);
    expect(await metaOnlyResponse.json()).toEqual({
      hasMapUpdates: false,
      mapUpdatesCount: 0,
    });

    const secondGroup = await getGroup(groupId);
    await db.insert(mapGroupLocations).values({
      mapGroupId: groupId,
      panoId: 'pano-added-after-meta-sync',
      extraTag: 'us',
      lat: 9,
      lng: 8,
      heading: 7,
      pitch: 6,
      zoom: 5,
      modifiedAt: secondGroup.syncedAt! + 1,
    });
    expect(
      await db
        .select({ lat: mapGroupLocations.lat })
        .from(mapGroupLocations)
        .where(eq(mapGroupLocations.panoId, 'pano-added-after-meta-sync')),
    ).toEqual([{ lat: 9 }]);
    const locationResponse = await syncRequest('sync-change-owner', groupId);

    expect(locationResponse.status).toBe(200);
    expect(
      await db
        .select({ lat: syncedLocations.lat })
        .from(syncedLocations)
        .where(
          and(
            eq(syncedLocations.syncedMetaId, metaId),
            eq(syncedLocations.panoId, 'pano-added-after-meta-sync'),
          ),
        ),
    ).toEqual([{ lat: 9 }]);
    expect(await locationResponse.json()).toEqual({
      hasMapUpdates: true,
      mapUpdatesCount: 1,
    });
  });

  test('editor is denied with source and synced state unchanged', async () => {
    await seedUser('sync-owner-2');
    await seedUser('sync-editor-2');
    const { groupId } = await seedSyncFixture(
      'sync-owner-2',
      'Sync editor group',
      'sync-editor-map',
    );
    await seedMember(groupId, 'sync-editor-2');

    const response = await syncRequest('sync-editor-2', groupId);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual([
      "You don't have permissions for this",
    ]);
    expect(await getGroup(groupId)).toEqual({
      syncedAt: null,
      syncIncludeLocationsNotOnStreetView: true,
    });
    expect(await db.select().from(syncedMetas)).toEqual([]);
    expect(await db.select().from(syncedLocations)).toEqual([]);
    expect(await db.select().from(syncedMapMetas)).toEqual([]);
    expect(await getSyncMarkers(groupId)).toEqual([]);
  });
});
