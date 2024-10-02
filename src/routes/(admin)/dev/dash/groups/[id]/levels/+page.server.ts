import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { asc, eq } from 'drizzle-orm';
import { levels, mapGroups } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { getGroupId } from '.././utils';
import { createInsertSchema } from 'drizzle-zod';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

const insertLevelsSchema = createInsertSchema(levels);
export type InsertLevelsSchema = typeof insertLevelsSchema;

export const load: PageServerLoad = async ({ params }) => {
  const id = getGroupId(params);

  const group = await db.query.mapGroups.findFirst({
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
  updateLevel: async ({ request }) => {
    const form = await superValidate(request, zod(insertLevelsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { id, ...dataNoId } = form.data;

    if (id == undefined) {
      await db.insert(levels).values(dataNoId).onConflictDoNothing();
    } else {
      await db.update(levels).set(dataNoId).where(eq(levels.id, id));
    }
  }
};
