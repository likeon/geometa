import {
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  metas,
  users
} from '$lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { ensurePermissions } from '$lib/utils';

export const prerender = false;
const insertMapGroupSchema = createInsertSchema(mapGroups).pick({ name: true });
const updateMapGroupSchema = createInsertSchema(mapGroups).pick({ name: true, id: true });

export const load = async ({ locals }) => {
  const userGroups = await locals.db
    .select({
      id: mapGroups.id,
      name: mapGroups.name,
      locationCount:
        sql<number>`(SELECT COUNT(${mapGroupLocations.id}) FROM ${mapGroupLocations} WHERE ${mapGroupLocations.mapGroupId} = ${mapGroups.id})`.mapWith(
          Number
        ),
      metasCount:
        sql<number>`(SELECT COUNT(${metas.id}) FROM ${metas} WHERE ${metas.mapGroupId} = ${mapGroups.id})`.mapWith(
          Number
        ),
      mapsCount:
        sql<number>`(SELECT COUNT(${maps.id}) FROM ${maps} WHERE ${maps.mapGroupId} = ${mapGroups.id})`.mapWith(
          Number
        ),
      gamesPlayed:
        sql<number>`(SELECT COALESCE(SUM(${maps.numberOfGamesPlayed}), 0) FROM ${maps} WHERE ${maps.mapGroupId} = ${mapGroups.id})`.mapWith(
          Number
        )
    })
    .from(mapGroups)
    .innerJoin(mapGroupPermissions, eq(mapGroupPermissions.mapGroupId, mapGroups.id))
    .where(eq(mapGroupPermissions.userId, locals.user!.id))
    .orderBy(desc(mapGroups.id));

  const user = await locals.db.query.users.findFirst({ where: eq(users.id, locals.user!.id) });
  let allGroups;
  if (user?.isSuperadmin) {
    allGroups = await locals.db
      .select({
        id: mapGroups.id,
        name: mapGroups.name,
        authors: sql<string | null>`
          (SELECT string_agg(u.username, ', ')
           FROM map_group_permissions mgp
                  JOIN "user" u ON u.id = mgp.user_id
           WHERE mgp.map_group_id = map_groups.id)`,
        locationCount: sql<number>`count
          (${mapGroupLocations.id})`.mapWith(Number)
      })
      .from(mapGroups)
      .leftJoin(mapGroupLocations, eq(mapGroups.id, mapGroupLocations.mapGroupId))
      .groupBy(mapGroups.id)
      .orderBy(
        desc(sql<number>`count
        (${mapGroupLocations.id})`)
      );
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

    const insertedData = await locals.db
      .insert(mapGroups)
      .values(form.data)
      .returning({ insertedId: mapGroups.id });
    await locals.db
      .insert(mapGroupPermissions)
      .values({ mapGroupId: insertedData[0].insertedId, userId: locals.user!.id });
    throw redirect(303, `/dev/dash/groups/${insertedData[0].insertedId}`);
  },
  updateGroupName: async ({ request, locals }) => {
    const form = await superValidate(request, zod(updateMapGroupSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    await ensurePermissions(locals.db, locals.user!.id, form.data.id);
    await locals.db
      .update(mapGroups)
      .set({ name: form.data.name })
      .where(eq(mapGroups.id, form.data.id!));
  }
};
