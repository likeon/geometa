import { db } from '$lib/drizzle';
import {
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users
} from '$lib/db/schema';
import { and, desc, eq, isNull, lt, not, or, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import {
  ensurePermissions,
  extractJsonData,
  generateRandomString,
  getFileExtension
} from '$lib/utils';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeStringify from 'rehype-stringify';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { getGroupId } from '$routes/(admin)/dev/dash/groups/[id]/utils';
import { uploadFile } from '$lib/s3';
import { dev } from '$app/environment';
import { syncUserScriptData } from '$lib/user-script';

export const prerender = false;
const insertMapGroupSchema = createInsertSchema(mapGroups).pick({ name: true });

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
  }
};
