import type { PageServerLoad } from './$types';
import { eq, sql } from 'drizzle-orm';
import { mapGroups } from '$lib/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { getGroupId } from '.././utils';
import { ensurePermissions } from '$lib/utils';

export const load: PageServerLoad = async ({ params, locals }) => {
  const id = getGroupId(params);
  await ensurePermissions(locals.db, locals.user!.id, id);

  const group = await locals.db.query.mapGroups.findFirst({
    extras: {
      metasCount: sql<number>`(
        SELECT COUNT(*)
        FROM metas m
        WHERE m.map_group_id = ${id}
      )`.as('metas_count'),
      locationsCount: sql<number>`(
        SELECT COUNT(*)
        FROM map_group_locations mgl
        WHERE mgl.map_group_id = ${id}
      )`.as('locations_count')
    },
    where: eq(mapGroups.id, id)
  });

  if (!group) {
    error(404, 'No group');
  }
  console.debug(group);
  return {
    group
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
    redirect(303, '/dev/dash');
  }
};
