import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { and, asc, eq, not, notInArray, sql } from 'drizzle-orm';
import {
  levels,
  mapGroupLocations,
  mapGroups,
  mapLocations,
  maps,
  metaImages,
  metaLevels,
  metas
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import {
  cloudflareKvBulkPut,
  cutToTwoDecimals,
  extractJsonData,
  generateRandomString,
  getCountryFromTagName,
  getFileExtension
} from '$lib/utils';
import { getGroupId } from './utils';
import { uploadFile } from '$lib/s3';
import { dev } from '$app/environment';

const insertMetasSchema = createInsertSchema(metas)
  .extend({ levels: z.array(z.number()) })
  .omit({ noteFromPlonkit: true, hasImage: true });
export type InsertMetasSchema = typeof insertMetasSchema;

const mapUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' })
});
export type MapUploadSchema = typeof mapUploadSchema;

const imageUploadSchema = z.object({
  metaId: z.number(),
  file: z.instanceof(File, { message: 'Please upload an image' })
});
export type ImageUploadSchema = typeof imageUploadSchema;

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
        with: { metaLevels: { with: { level: true } }, images: true },
        extras: {
          locationsCount:
            sql`(select count(*) from location_metas_view lm where lm.meta_id = ${metas.id})`.as(
              'locations_count'
            )
        }
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
  const imageUploadForm = await superValidate(zod(imageUploadSchema));

  return {
    group,
    metaForm,
    levelList,
    mapUploadForm,
    imageUploadForm
  };
};

export const actions = {
  updateMeta: async ({ request }) => {
    const form = await superValidate(request, zod(insertMetasSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

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
        eq(mapGroupLocations.mapGroupId, groupId),
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
  uploadMetaImages: async ({ request }) => {
    const form = await superValidate(request, zod(imageUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }

    const imageName = `${generateRandomString(36)}.${getFileExtension(form.data.file)}`;
    await uploadFile(form.data.file, imageName);

    const url = `https://static${dev ? '-dev' : ''}.learnablemeta.com/${imageName}`;

    const result = await db
      .insert(metaImages)
      .values({ metaId: form.data.metaId, image_url: url })
      .returning({ id: metaImages.id, metaId: metaImages.metaId, image_url: metaImages.image_url });
    return message(form, result[0]);
  },
  deleteMetaImage: async ({ request }) => {
    const data = await request.formData();
    const imageId = parseInt((data.get('imageId') as string) || '', 10);
    if (isNaN(imageId)) {
      error(400, 'Invalid ID');
    }

    await db.delete(metaImages).where(eq(metaImages.id, imageId));
    return { success: true, imageId: imageId };
  },
  prepareUserScriptData: async (event) => {
    const groupId = getGroupId(event.params);
    const dbValues = await db
      .select({
        geoguessrId: maps.geoguessrId,
        lat: mapLocations.lat,
        lng: mapLocations.lng,
        tagName: mapLocations.tagName,
        metaName: mapLocations.metaName,
        metaNote: mapLocations.metaNote,
        images: sql`(select GROUP_CONCAT(mi.image_url) from meta_images mi where mi.meta_id = ${mapLocations.metaId})`
      })
      .from(mapLocations)
      .innerJoin(maps, eq(mapLocations.mapId, maps.id))
      .where(eq(maps.mapGroupId, groupId))
      .orderBy(asc(maps.id));

    const kvData = [];
    for (const item of dbValues) {
      const key = `${item.geoguessrId}:${cutToTwoDecimals(item.lat)}:${cutToTwoDecimals(item.lng)}`;
      const countryName = getCountryFromTagName(item.tagName);
      const plonkitCountryUrl = `https://www.plonkit.net/${countryName.toLowerCase().replace(' ', '-')}`;

      let images: string[];
      if (item.images) {
        images = (item.images as string).split(',');
      } else {
        images = [];
      }

      const value = {
        country: getCountryFromTagName(item.tagName),
        metaName: item.metaName,
        note: item.metaNote,
        plonkitCountryUrl: plonkitCountryUrl,
        images: images
      };
      kvData.push({ key: key, value: JSON.stringify(value), base64: false });
    }

    await cloudflareKvBulkPut(kvData);
  }
};
