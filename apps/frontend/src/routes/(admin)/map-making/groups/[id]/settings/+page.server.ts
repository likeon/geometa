import { and, eq, sql } from 'drizzle-orm';
import { mapGroupPermissions, mapGroups, users } from '$lib/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { getGroupId } from '../utils';
import { ensurePermissions } from '$lib/utils';
import { z } from 'zod/v4';
import type { DB } from '$lib/drizzle';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { api } from '$lib/api';

const basePermissionDeleteSchema = z.object({
  permissionId: z.coerce.number().int()
});

const settingsSchema = z.object({
  syncIncludeLocationsNotOnStreetView: z.boolean()
});

function createPermissionDeleteSchema(db: DB, groupId: number, requestUserId: string) {
  return basePermissionDeleteSchema.superRefine(async (data, ctx) => {
    const permission = await db.query.mapGroupPermissions.findFirst({
      where: and(
        eq(mapGroupPermissions.id, data.permissionId),
        eq(mapGroupPermissions.mapGroupId, groupId)
      )
    });
    if (!permission) {
      ctx.addIssue({
        code: 'custom',
        path: ['permissionId'],
        message: `Permission not found`
      });
      return;
    }

    if (permission.userId == requestUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['permissionId'],
        message: `Can't strip your own permissions`
      });
      return;
    }
  });
}

function createPermissionCreateSchema(db: DB, groupId: number) {
  return z
    .object({ username: z.string().transform((val) => (val.startsWith('@') ? val.slice(1) : val)) })
    .superRefine(async (data, ctx) => {
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, data.username));
      if (!user.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['username'],
          message: `Discord user with this username is not in our database`
        });
        return;
      }
      const existingPermission = await db
        .select({ id: mapGroupPermissions.id })
        .from(mapGroupPermissions)
        .innerJoin(users, eq(mapGroupPermissions.userId, users.id))
        .where(and(eq(mapGroupPermissions.mapGroupId, groupId), eq(users.username, data.username)))
        .limit(1);
      if (existingPermission.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['username'],
          message: `This user already has the permissions`
        });
        return;
      }
    });
}

export const load = async ({ params, locals }) => {
  const id = getGroupId(params);
  await ensurePermissions(locals.db, locals.user!.id, id);

  const group = await locals.db.query.mapGroups.findFirst({
    extras: {
      metasCount: sql<number>`(SELECT COUNT(*)
                               FROM metas m
                               WHERE m.map_group_id = ${id})`.as('metas_count'),
      locationsCount: sql<number>`(SELECT COUNT(*)
                                   FROM map_group_locations mgl
                                   WHERE mgl.map_group_id = ${id})`.as('locations_count')
    },
    with: { permissions: { with: { user: true } } },
    where: eq(mapGroups.id, id)
  });

  if (!group) {
    error(404, 'No group');
  }

  const permissionCreateForm = await superValidate(
    zod4(createPermissionCreateSchema(locals.db, id))
  );
  const settingsForm = await superValidate(
    { syncIncludeLocationsNotOnStreetView: group.syncIncludeLocationsNotOnStreetView },
    zod4(settingsSchema)
  );
  return {
    group,
    user: locals.user!,
    permissionCreateForm,
    settingsForm
  };
};

export const actions = {
  deleteGroup: async ({ request, locals }) => {
    const data = await request.formData();
    const groupIdRaw = data.get('id');
    if (!groupIdRaw) {
      return fail(400);
    }
    const groupId = parseInt(groupIdRaw as string);
    await ensurePermissions(locals.db, locals.user!.id, groupId);

    await locals.db.delete(mapGroups).where(eq(mapGroups.id, groupId));
    redirect(303, '/map-making');
  },
  deletePermission: async ({ request, locals, params }) => {
    const groupId = getGroupId(params);
    const permissionDeleteSchema = createPermissionDeleteSchema(
      locals.db,
      groupId,
      locals.user!.id
    );
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    try {
      const data = await permissionDeleteSchema.parseAsync(rawData);
      await locals.db
        .delete(mapGroupPermissions)
        .where(eq(mapGroupPermissions.id, data.permissionId));
      return {
        success: true
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        const { fieldErrors } = err.flatten();
        return fail(400, {
          errors: fieldErrors,
          formData: rawData
        });
      }
      throw err;
    }
  },
  createPermission: async ({ request, locals, params }) => {
    const groupId = getGroupId(params);
    const form = await superValidate(
      request,
      zod4(createPermissionCreateSchema(locals.db, groupId))
    );
    if (!form.valid) {
      return fail(400, { form });
    }

    const user = (
      await locals.db.select().from(users).where(eq(users.username, form.data.username))
    )[0];
    await locals.db.insert(mapGroupPermissions).values({ mapGroupId: groupId, userId: user.id });
  },
  updateSettings: async ({ params, request }) => {
    const form = await superValidate(request, zod4(settingsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal['map-groups']({
      id: getGroupId(params)
    }).settings.post(form.data);
    if (apiError) {
      // todo: handle 403 and 404
      throw new Error('unexpected api error');
    }
  }
};
