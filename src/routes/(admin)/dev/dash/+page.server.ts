import { db } from '$lib/drizzle';
import { mapGroupPermissions, mapGroups } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }

  const groups = await db
    .select()
    .from(mapGroups)
    .innerJoin(mapGroupPermissions, eq(mapGroupPermissions.mapGroupId, mapGroups.id))
    .where(eq(mapGroupPermissions.userId, locals.user.id));

  return { groups };
};
