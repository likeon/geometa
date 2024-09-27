import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { and, asc, eq, not, notInArray, sql } from 'drizzle-orm';
import {
	levels,
	mapGroupLocations,
	mapGroups,
	mapLocations,
	maps,
	metaLevels,
	metas
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { cloudflareKvBulkPut, extractJsonData, getCountryFromTagName } from '$lib/utils';
import { getGroupId } from './utils';

const insertMetasSchema = createInsertSchema(metas).extend({ levels: z.array(z.number()) });
const mapUploadSchema = z.object({
	file: z.instanceof(File, { message: 'Please upload a file.' })
});
const mapJsonSchema = z.object({
	customCoordinates: z
		.object({
			lat: z.number(),
			lng: z.number(),
			heading: z.number(),
			pitch: z.number(),
			zoom: z.number(),
			panoId: z.string().optional(),
			extra: z.object({
				tags: z.string().array().length(1),
				panoId: z.string().optional(),
				panoDate: z.string()
			})
		})
		.array()
});
type UpsertValue = {
	mapGroupId: number;
	lat: number;
	lng: number;
	heading: number;
	pitch: number;
	zoom: number;
	panoId: string | null;
	extraTag: string;
	extraPanoId: string | null;
	extraPanoDate: string;
};

export const load: PageServerLoad = async ({ params }) => {
	const id = getGroupId(params);

	const group = await db.query.mapGroups.findFirst({
		with: {
			metas: {
				orderBy: [asc(metas.id)],
				with: { metaLevels: { with: { level: true } } }
			}
		},
		where: eq(mapGroups.id, id)
	});

	if (!group) {
		error(404, 'No group');
	}
	const levelList = await db.query.levels.findMany({ where: eq(levels.mapGroupId, group?.id) });

	const metaForm = await superValidate(zod(insertMetasSchema));
	const mapUploadForm = await superValidate(zod(mapUploadSchema));

	return {
		group,
		metaForm,
		levelList,
		mapUploadForm
	};
};

export const actions = {
	updateMeta: async ({ request }) => {
		const form = await superValidate(request, zod(insertMetasSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		form.data.noteFromPlonkit = form.data.noteFromPlonkit ?? false;
		form.data.hasImage = form.data.hasImage ?? false;

		const { id, levels, ...dataNoId } = form.data;
		let metaId;

		if (id === undefined) {
			const insertResult = await db
				.insert(metas)
				.values(form.data)
				.returning({ insertedId: metas.id });
			metaId = insertResult[0].insertedId;
		} else {
			await db.update(metas).set(dataNoId).where(eq(metas.id, id));
			metaId = id;
		}

		await db
			.delete(metaLevels)
			.where(and(eq(metaLevels.metaId, metaId), not(inArray(metaLevels.levelId, levels))));
		const levelsInsertValues = levels.map((levelId) => ({ levelId: levelId, metaId: metaId }));
		await db.insert(metaLevels).values(levelsInsertValues).onConflictDoNothing();
	},
	uploadMapJson: async ({ request, params }) => {
		const groupId = getGroupId(params);
		const form = await superValidate(request, zod(mapUploadSchema));

		if (!form.valid) {
			return fail(400, withFiles({ form }));
		}

		const jsonData = await extractJsonData(form.data.file);
		const validationResult = mapJsonSchema.safeParse(jsonData);

		if (!validationResult.success) {
			return setError(form, 'file', "JSON doesn't match the expected format");
		}

		const upsertValues: UpsertValue[] = [];
		const usedTags = new Set<string>();
		validationResult.data.customCoordinates.forEach((location) => {
			upsertValues.push({
				mapGroupId: groupId,
				lat: location.lat,
				lng: location.lng,
				heading: location.heading,
				pitch: location.pitch,
				zoom: location.zoom,
				panoId: location.panoId || null,
				extraTag: location.extra.tags[0],
				extraPanoId: location.extra.panoId || null,
				extraPanoDate: location.extra.panoDate
			});
			usedTags.add(location.extra.tags[0]);
		});

		// upsert data
		const upsertResult = await db
			.insert(mapGroupLocations)
			.values(upsertValues)
			.onConflictDoUpdate({
				target: [mapGroupLocations.mapGroupId, mapGroupLocations.lat, mapGroupLocations.lng],
				set: {
					heading: sql`excluded.heading`,
					pitch: sql`excluded.pitch`,
					zoom: sql`excluded.zoom`,
					panoId: sql`excluded.pano_id`,
					extraTag: sql`excluded.extra_tag`,
					extraPanoId: sql`excluded.extra_pano_id`,
					extraPanoDate: sql`excluded.extra_pano_date`
				}
			})
			.returning({ id: mapGroupLocations.id });

		// delete rows that weren't updated
		await db.delete(mapGroupLocations).where(
			and(
				eq(mapGroupLocations.id, groupId),
				notInArray(
					mapGroupLocations.id,
					upsertResult.map((item) => item.id)
				)
			)
		);

		// upsert tag names into metas
		const metaInsertValues = Array.from(usedTags).map((tagName) => ({
			mapGroupId: groupId,
			tagName: tagName,
			name: '',
			note: ''
		}));
		await db.insert(metas).values(metaInsertValues).onConflictDoNothing();
	},
	prepareUserScriptData: async (event) => {
		const groupId = getGroupId(event.params);
		const dbValues = await db
			.select()
			.from(mapLocations)
			.innerJoin(maps, eq(mapLocations.mapId, maps.id))
			.where(eq(maps.mapGroupId, groupId))
			.orderBy(asc(maps.id));

		const kvData = [];
		for (const item of dbValues) {
			const key = `${item.maps.geoguessrId}:${item.map_locations_view.lat}:${item.map_locations_view.lng}`;
			const value = {
				country: getCountryFromTagName(item.map_locations_view.tagName),
				metaName: item.map_locations_view.metaName,
				note: item.map_locations_view.metaNote,
				noteFromPlonkit: item.map_locations_view.metaNoteFromPlonkit
			};
			kvData.push({ key: key, value: JSON.stringify(value), base64: false });
		}

		await cloudflareKvBulkPut(kvData);
	}
};
