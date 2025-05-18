import { db } from '@lib/drizzle';
import { and, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { mapGroupPermissions, users } from '../db/schema';

class PermissionsDeniedError extends Error {}

export async function ensurePermissions(userId: string, groupId: number) {
  const [permission, superadminUser] = await Promise.all([
    db.query.mapGroupPermissions.findFirst({
      where: and(
        eq(mapGroupPermissions.userId, userId),
        eq(mapGroupPermissions.mapGroupId, groupId),
      ),
    }),
    db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.isSuperadmin, true)),
    }),
  ]);

  if (!(permission || superadminUser)) {
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
