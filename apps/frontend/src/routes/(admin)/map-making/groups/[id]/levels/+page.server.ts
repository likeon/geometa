import { asc, eq } from 'drizzle-orm';
import { levels, mapGroups } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { getGroupId } from '../utils';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { ensurePermissions } from '$lib/utils';
import { insertLevelsSchema } from '$lib/form-schema';

export const load = async ({ params, locals }) => {
  const id = getGroupId(params);

  const group = await locals.db.query.mapGroups.findFirst({
    with: {
      levels: {
        orderBy: [asc(levels.name)]
      }
    },
    where: eq(mapGroups.id, id)
  });

  if (!group) {
    error(404, 'No group');
  }

  const levelForm = await superValidate(zod(insertLevelsSchema));
  return {
    group,
    levelForm
  };
};

export const actions = {
  deleteLevel: async ({ request, locals }) => {
    const data = await request.formData();
    const levelId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(levelId)) {
      error(400, 'Invalid ID');
    }

    const level = await locals.db.query.levels.findFirst({ where: eq(levels.id, levelId) });
    await ensurePermissions(locals.db, locals.user?.id, level?.mapGroupId);

    await locals.db.delete(levels).where(eq(levels.id, levelId));
  },

  updateLevel: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertLevelsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { id, ...dataNoId } = form.data;

    if (id == undefined) {
      await locals.db.insert(levels).values(dataNoId).onConflictDoNothing();
    } else {
      await locals.db.update(levels).set(dataNoId).where(eq(levels.id, id));
    }
  }
};
