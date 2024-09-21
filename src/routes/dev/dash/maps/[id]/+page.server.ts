import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { asc } from 'drizzle-orm';
import { mapMetas, metaTags } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
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

const insertMapMetasSchema = createInsertSchema(mapMetas).omit({mapId: true});
