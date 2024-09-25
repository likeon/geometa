import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { and, asc, eq, not } from 'drizzle-orm';
import { metas, levels, metaLevels } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';

export const load: PageServerLoad = async () => {
	const group = await db.query.mapGroups.findFirst({
		with: {
			metas: {
				orderBy: [asc(metas.id)],
				with: { metaLevels: { with: { level: true } } }
			}
		}
	});

	if (!group) {
		error(404, 'No group');
	}
	const levelList = await db.query.levels.findMany({ where: eq(levels.mapGroupId, group?.id) });

	const form = await superValidate(zod(insertMetasSchema));

	return {
		group,
		form,
		levelList
	};
};

const insertMetasSchema = createInsertSchema(metas).extend({ levels: z.array(z.number()) });

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(insertMetasSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		form.data.noteFromPlonkit = form.data.noteFromPlonkit ?? false;
		form.data.hasImage = form.data.hasImage ?? false;

		const { id, levels, ...dataNoId } = form.data;
    console.debug(levels);
    let metaId;

		if (id === undefined) {
			const insertResult = await db.insert(metas).values(form.data).returning({ insertedId: metas.id });
      metaId = insertResult[0].insertedId;
		} else {
			await db.update(metas).set(dataNoId).where(eq(metas.id, id));
      metaId = id;
		}

    await db.delete(metaLevels).where(and(eq(metaLevels.metaId, metaId), not(inArray(metaLevels.levelId, levels))))
    const levelsInsertValues = levels.map((levelId => ({'levelId': levelId, 'metaId': metaId})));
    await db.insert(metaLevels).values(levelsInsertValues).onConflictDoNothing()
	}
};
