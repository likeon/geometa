import { describe, expect, test } from 'bun:test';
import { app } from '../../../api';
import {
  mapGroupPermissions,
  mapGroups,
  maps,
  users,
} from '../../../lib/db/schema';
import { db } from '../../../lib/drizzle';

async function seedUser(id: string, isSuperadmin = false, apiToken?: string) {
  await db.insert(users).values({
    id,
    username: id,
    isSuperadmin,
    apiToken: apiToken ?? null,
  });
}

async function seedGroup(name: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  return group!.id;
}

async function seedGroupMap(
  name: string,
  geoguessrId: string,
  groupId: number,
) {
  const [map] = await db
    .insert(maps)
    .values({ mapGroupId: groupId, name, geoguessrId, isPersonal: false })
    .returning({ id: maps.id });
  return map!.id;
}

async function seedPersonalMap(
  ownerId: string,
  name: string,
  geoguessrId: string,
) {
  const [map] = await db
    .insert(maps)
    .values({ userId: ownerId, name, geoguessrId, isPersonal: true })
    .returning({ id: maps.id });
  return map!.id;
}

async function seedPermission(
  groupId: number,
  userId: string,
  role: 'owner' | 'editor',
) {
  await db
    .insert(mapGroupPermissions)
    .values({ mapGroupId: groupId, userId, role });
}

function mapGroupRequest(geoguessrId: string, userId: string) {
  return app.handle(
    new Request(`http://localhost/api/internal/maps/mapgroup/${geoguessrId}`, {
      headers: { 'x-api-user-id': userId },
    }),
  );
}

interface PermissionUser {
  id: string;
  username: string;
  isTrusted: boolean;
  isSuperadmin: boolean;
  apiToken: string | null;
}

interface Permission {
  id: number;
  mapGroupId: number;
  userId: string;
  role: 'owner' | 'editor';
  user: PermissionUser;
}

interface GroupResponse {
  isPersonal: boolean;
  id: number;
  name: string;
  syncedAt: number | null;
  syncIncludeLocationsNotOnStreetView: boolean;
  owners: string;
  permissions: Permission[];
}

describe('GET /api/internal/maps/mapgroup/:geoguessrId', () => {
  test('denies non-superadmin callers with 403', async () => {
    await seedUser('user-1');
    await seedUser('admin-1', true);
    const groupId = await seedGroup('Test group');
    await seedGroupMap('Group Map', 'group-map', groupId);

    const response = await mapGroupRequest('group-map', 'user-1');

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden: Admin access required');
  });

  test('superadmin gets 404 for a missing map', async () => {
    await seedUser('admin-1', true);

    const response = await mapGroupRequest('no-such-map', 'admin-1');

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Map not found');
  });

  test('superadmin gets the personal map branch', async () => {
    await seedUser('admin-1', true);
    await seedUser('owner-1');
    const id = await seedPersonalMap('owner-1', 'My Map', 'personal-map');

    const response = await mapGroupRequest('personal-map', 'admin-1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      isPersonal: true,
      id,
      name: 'My Map',
      owner: 'owner-1',
      userId: 'owner-1',
    });
  });

  describe('group map branch', () => {
    test('superadmin gets the group with an owners summary', async () => {
      await seedUser('admin-1', true);
      await seedUser('owner-1', false, 'owner-secret-token');
      await seedUser('editor-1', false, 'editor-secret-token');
      const groupId = await seedGroup('Test group');
      await seedGroupMap('Group Map', 'group-map', groupId);
      await seedPermission(groupId, 'owner-1', 'owner');
      await seedPermission(groupId, 'editor-1', 'editor');

      const response = await mapGroupRequest('group-map', 'admin-1');
      expect(response.status).toBe(200);
      const body = (await response.json()) as GroupResponse;

      // security-relevant public shape only: the nested permission users are
      // intentionally not asserted to include or exclude apiToken here (see
      // the omission todo below)
      expect(body).toMatchObject({
        isPersonal: false,
        id: groupId,
        name: 'Test group',
        syncedAt: null,
        syncIncludeLocationsNotOnStreetView: true,
      });
      expect(body.owners.split(', ').sort()).toEqual(['editor-1', 'owner-1']);
      expect(
        body.permissions
          .map(({ mapGroupId, userId, role, user }) => ({
            mapGroupId,
            userId,
            role,
            user: {
              id: user.id,
              username: user.username,
              isTrusted: user.isTrusted,
              isSuperadmin: user.isSuperadmin,
            },
          }))
          .sort((a, b) => a.userId.localeCompare(b.userId)),
      ).toEqual([
        {
          mapGroupId: groupId,
          userId: 'editor-1',
          role: 'editor',
          user: {
            id: 'editor-1',
            username: 'editor-1',
            isTrusted: false,
            isSuperadmin: false,
          },
        },
        {
          mapGroupId: groupId,
          userId: 'owner-1',
          role: 'owner',
          user: {
            id: 'owner-1',
            username: 'owner-1',
            isTrusted: false,
            isSuperadmin: false,
          },
        },
      ]);
      expect(body).not.toHaveProperty('owner');
      expect(body).not.toHaveProperty('userId');
    });

    test.todo('omits apiToken from nested permission users', async () => {
      // Defect: the handler loads mapGroup.permissions with `with: { user: true }`
      // (src/routes/internal/maps/index.ts), so each nested user carries its
      // apiToken. The group response must not expose secrets to the internal API.
      await seedUser('admin-1', true);
      await seedUser('owner-1', false, 'owner-secret-token');
      const groupId = await seedGroup('Test group');
      await seedGroupMap('Group Map', 'group-map', groupId);
      await seedPermission(groupId, 'owner-1', 'owner');

      const response = await mapGroupRequest('group-map', 'admin-1');
      const body = (await response.json()) as GroupResponse;

      for (const permission of body.permissions) {
        expect(permission.user).not.toHaveProperty('apiToken');
      }
    });
  });
});
