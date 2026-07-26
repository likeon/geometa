import { db } from '@api/lib/drizzle';
import { and, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { mapGroupPermissions, maps, users } from '../db/schema';

class PermissionsDeniedError extends Error {}

export async function ensureMapAccess(userId: string, mapId: number) {
  const [map, superadminUser] = await Promise.all([
    db.$primary.query.maps.findFirst({
      where: and(eq(maps.id, mapId), eq(maps.userId, userId)),
    }),
    db.$primary.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.isSuperadmin, true)),
    }),
  ]);

  if (!(map || superadminUser)) {
    throw new PermissionsDeniedError();
  }
}

// Resolves the caller's role in a group: 'owner' | 'editor'.
// Superadmins are treated as owners of every group.
export async function getGroupRole(
  userId: string,
  groupId: number,
): Promise<'owner' | 'editor' | null> {
  const [permission, superadminUser] = await Promise.all([
    db.$primary.query.mapGroupPermissions.findFirst({
      where: and(
        eq(mapGroupPermissions.userId, userId),
        eq(mapGroupPermissions.mapGroupId, groupId),
      ),
    }),
    db.$primary.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.isSuperadmin, true)),
    }),
  ]);

  if (superadminUser) {
    return 'owner';
  }
  return permission?.role ?? null;
}

export async function ensurePermissions(userId: string, groupId: number) {
  const role = await getGroupRole(userId, groupId);
  if (!role) {
    throw new PermissionsDeniedError();
  }
  return role;
}

export async function ensureOwner(userId: string, groupId: number) {
  const role = await getGroupRole(userId, groupId);
  if (role !== 'owner') {
    throw new PermissionsDeniedError();
  }
}

export function permissionErrorCatcher() {
  return new Elysia()
    .error({ PermissionsDeniedError })
    .onError(({ code, set }) => {
      if (code === 'PermissionsDeniedError') {
        set.status = 403;
        return ["You don't have permissions for this"];
      }
    })
    .as('global');
}
