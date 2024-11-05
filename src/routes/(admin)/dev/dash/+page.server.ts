import { db } from '$lib/drizzle';
import { mapGroupLocations, mapGroupPermissions, mapGroups, users } from '$lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const prerender = false;

export const load = async ({ locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }

  const userGroups = await db
    .select()
    .from(mapGroups)
    .innerJoin(mapGroupPermissions, eq(mapGroupPermissions.mapGroupId, mapGroups.id))
    .where(eq(mapGroupPermissions.userId, locals.user.id));

  const user = await db.query.users.findFirst({ where: eq(users.id, locals.user.id) });
  let allGroups;
  if (user?.isSuperadmin) {
    allGroups = await db
      .select({
        id: mapGroups.id,
        name: mapGroups.name,
        authors: sql<string | null>`
          (SELECT GROUP_CONCAT(u.username)
           FROM map_group_permissions mgp
           JOIN user u ON u.id = mgp.user_id
           WHERE mgp.map_group_id = "map_groups"."id")`,
        locationCount: sql<number>`count(${mapGroupLocations.id})`.mapWith(Number)
      })
      .from(mapGroups)
      .leftJoin(mapGroupLocations, eq(mapGroups.id, mapGroupLocations.mapGroupId))
      .groupBy(mapGroups.id)
      .orderBy(desc(sql<number>`count(${mapGroupLocations.id})`));
  } else {
    allGroups = null;
  }
  return { userGroups, allGroups };
};
