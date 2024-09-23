import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { asc, eq } from 'drizzle-orm';
import { mapMetas, metaTags } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	const map = await db.query.maps.findFirst({ with: { metas: { orderBy: [asc(metaTags.id)] } } });

	if (!map) {
		error(404, 'Map not found');
	}

	const form = await superValidate(zod(insertMapMetasSchema));

	return {
		map: map,
		form: form,
	};
};

const insertMapMetasSchema = createInsertSchema(mapMetas)

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(insertMapMetasSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

    form.data.noteFromPlonkit = form.data.noteFromPlonkit ?? false;
    form.data.hasImage = form.data.hasImage ?? false;

    const {id, ...dataNoId } = form.data;

    if (id === undefined) {
      await db.insert(mapMetas).values(form.data)
    } else {
      await db.update(mapMetas).set(dataNoId).where(eq(mapMetas.id, id))
    }
	}
};
