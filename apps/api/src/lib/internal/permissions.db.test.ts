import { describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { mapGroupPermissions, mapGroups, maps, users } from '../db/schema';
import { db } from '../drizzle';
import {
  ensureMapAccess,
  ensureOwner,
  ensurePermissions,
  getGroupRole,
  permissionErrorCatcher,
} from './permissions';

const permissionDeniedMessage = "You don't have permissions for this";

function buildPermissionApp(groupId: number) {
  return new Elysia()
    .use(permissionErrorCatcher())
    .post('/denied', async () => {
      await ensurePermissions('outsider', groupId);
      return 'ok';
    })
    .post('/boom', () => {
      throw new Error('unrelated failure');
    })
    .post('/db-error', async () => {
      await db.execute(sql`select * from nonexistent_table_probe`);
      return 'ok';
    });
}

async function seedUser(id: string, isSuperadmin = false) {
  await db.insert(users).values({ id, username: id, isSuperadmin });
}

async function seedPersonalMap(ownerId: string) {
  const [map] = await db
    .insert(maps)
    .values({
      name: 'Personal map',
      geoguessrId: `personal-${ownerId}`,
      isPersonal: true,
      userId: ownerId,
    })
    .returning({ id: maps.id });
  return map!.id;
}

async function seedGroup(name: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  return group!.id;
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

describe('ensureMapAccess', () => {
  test('personal map owner succeeds', async () => {
    await seedUser('owner');
    const mapId = await seedPersonalMap('owner');

    await expect(ensureMapAccess('owner', mapId)).resolves.toBeUndefined();
  });

  test('unrelated user fails', async () => {
    await seedUser('owner');
    await seedUser('intruder');
    const mapId = await seedPersonalMap('owner');

    await expect(ensureMapAccess('intruder', mapId)).rejects.toThrow();
  });

  test('superadmin succeeds without owning the map', async () => {
    await seedUser('owner');
    await seedUser('admin', true);
    const mapId = await seedPersonalMap('owner');

    await expect(ensureMapAccess('admin', mapId)).resolves.toBeUndefined();
  });
});

describe('group permissions', () => {
  test('group owner passes ensureOwner and ensurePermissions returns owner', async () => {
    await seedUser('owner');
    const groupId = await seedGroup('Group');
    await seedPermission(groupId, 'owner', 'owner');

    await expect(ensureOwner('owner', groupId)).resolves.toBeUndefined();
    await expect(ensurePermissions('owner', groupId)).resolves.toBe('owner');
    await expect(getGroupRole('owner', groupId)).resolves.toBe('owner');
  });

  test('editor passes ensurePermissions but ensureOwner rejects', async () => {
    await seedUser('editor');
    const groupId = await seedGroup('Group');
    await seedPermission(groupId, 'editor', 'editor');

    await expect(ensurePermissions('editor', groupId)).resolves.toBe('editor');
    await expect(getGroupRole('editor', groupId)).resolves.toBe('editor');
    await expect(ensureOwner('editor', groupId)).rejects.toThrow();
  });

  test('no-membership user is rejected by ensurePermissions and ensureOwner', async () => {
    await seedUser('outsider');
    const groupId = await seedGroup('Group');

    await expect(ensurePermissions('outsider', groupId)).rejects.toThrow();
    await expect(ensureOwner('outsider', groupId)).rejects.toThrow();
    await expect(getGroupRole('outsider', groupId)).resolves.toBeNull();
  });

  test('superadmin overrides to owner without any membership', async () => {
    await seedUser('admin', true);
    const groupId = await seedGroup('Group');

    await expect(getGroupRole('admin', groupId)).resolves.toBe('owner');
    await expect(ensurePermissions('admin', groupId)).resolves.toBe('owner');
    await expect(ensureOwner('admin', groupId)).resolves.toBeUndefined();
  });
});

describe('permissionErrorCatcher', () => {
  test('maps only PermissionsDeniedError to exact 403 response', async () => {
    await seedUser('outsider');
    const groupId = await seedGroup('Group');
    const app = buildPermissionApp(groupId);

    const response = await app.handle(
      new Request('http://localhost/denied', { method: 'POST' }),
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe(
      JSON.stringify([permissionDeniedMessage]),
    );
  });

  test('unrelated Error propagates instead of becoming 403', async () => {
    await seedUser('outsider');
    const groupId = await seedGroup('Group');
    const app = buildPermissionApp(groupId);

    const response = await app.handle(
      new Request('http://localhost/boom', { method: 'POST' }),
    );

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain('unrelated failure');
    expect(body).not.toContain(permissionDeniedMessage);
  });

  test('representative DB error propagates instead of becoming 403', async () => {
    await seedUser('outsider');
    const groupId = await seedGroup('Group');
    const app = buildPermissionApp(groupId);

    const response = await app.handle(
      new Request('http://localhost/db-error', { method: 'POST' }),
    );

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain('nonexistent_table_probe');
    expect(body).not.toContain(permissionDeniedMessage);
  });
});
