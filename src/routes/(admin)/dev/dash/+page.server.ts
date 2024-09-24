import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { asc, eq } from 'drizzle-orm';
import { metas } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	const group = await db.query.mapGroups.findFirst({ with: { metas: { orderBy: [asc(metas.id)] } } });

  if (!group) {
		error(404, 'No group');
	}

	const form = await superValidate(zod(insertMetasSchema));

	return {
		group: group,
		form: form,
	};
};

const insertMetasSchema = createInsertSchema(metas)

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(insertMetasSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

    form.data.noteFromPlonkit = form.data.noteFromPlonkit ?? false;
    form.data.hasImage = form.data.hasImage ?? false;

    const {id, ...dataNoId } = form.data;

    if (id === undefined) {
      await db.insert(metas).values(form.data)
    } else {
      await db.update(metas).set(dataNoId).where(eq(metas.id, id))
    }
	}
};
