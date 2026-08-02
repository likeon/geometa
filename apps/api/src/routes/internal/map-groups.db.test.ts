import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../../api';
import {
  mapGroupChanges,
  mapGroupPermissions,
  mapGroups,
  users,
} from '../../lib/db/schema';
import { db } from '../../lib/drizzle';

const syncedAt = 1700000000;

async function seedUser(id: string) {
  await db.insert(users).values({ id, username: id });
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
