import { db } from '$lib/drizzle';
import { mapGroupLocations, mapGroupPermissions, mapGroups, users } from '$lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { ensurePermissions } from '$lib/utils';
import { number } from 'zod';

export const prerender = false;
const insertMapGroupSchema = createInsertSchema(mapGroups).pick({ name: true });
const updateMapGroupSchema = createInsertSchema(mapGroups).pick({ name: true, id: true });

export const load = async ({ locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }

  const userGroups = await db
    .select({
      id: mapGroups.id,
      name: mapGroups.name,
      locationCount: sql<number>`COUNT(${mapGroupLocations.id})`.mapWith(Number)
    })
    .from(mapGroups)
    .innerJoin(mapGroupPermissions, eq(mapGroupPermissions.mapGroupId, mapGroups.id))
    .innerJoin(mapGroupLocations, eq(mapGroupLocations.mapGroupId, mapGroups.id))
    .where(eq(mapGroupPermissions.userId, locals.user.id))
    .groupBy(mapGroups.id);

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

  const mapGroupForm = await superValidate(zod(insertMapGroupSchema));
  return { userGroups, allGroups, mapGroupForm };
};

export const actions = {
  createGroup: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertMapGroupSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const insertedData = await db
      .insert(mapGroups)
      .values(form.data)
      .returning({ insertedId: mapGroups.id });
    await db
      .insert(mapGroupPermissions)
      .values({ mapGroupId: insertedData[0].insertedId, userId: locals.user!.id });
    throw redirect(303, `/dev/dash/groups/${insertedData[0].insertedId}`);
  },
  updateGroupName: async ({ request, locals }) => {
    const form = await superValidate(request, zod(updateMapGroupSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    await ensurePermissions(locals.user!.id, form.data.id);
    await db.update(mapGroups).set({ name: form.data.name }).where(eq(mapGroups.id, form.data.id!));
  }
};
