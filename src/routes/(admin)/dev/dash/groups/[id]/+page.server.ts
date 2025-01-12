import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { and, asc, eq, isNull, lt, not, or, sql, TransactionRollbackError } from 'drizzle-orm';
import {
  levels,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray, notInArray } from 'drizzle-orm/sql/expressions/conditions';
import {
  ensurePermissions,
  extractJsonData,
  generateRandomString,
  getFileExtension,
  markdown2Html
} from '$lib/utils';
import { getGroupId } from './utils';
import { uploadFile } from '$lib/s3';
import { dev } from '$app/environment';
import { syncUserScriptData } from '$lib/user-script';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeExternalLinks from 'rehype-external-links';
import { autoUpdateMaps } from './geo';
import { uploadMetas } from '$routes/(admin)/dev/dash/groups/[id]/metasUpload';

const insertMetasSchema = createInsertSchema(metas)
  .extend({ levels: z.array(z.number()) })
  .omit({ noteFromPlonkit: true, hasImage: true, noteHtml: true });
export type InsertMetasSchema = typeof insertMetasSchema;

const mapUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' }),
  partialUpload: z.boolean().default(true)
});
export type MapUploadSchema = typeof mapUploadSchema;

const imageUploadSchema = z.object({
  metaId: z.number(),
  file: z.instanceof(File, { message: 'Please upload an image' })
});
export type ImageUploadSchema = typeof imageUploadSchema;

const copyMetaSchema = z.object({
  metaId: z.number(),
  mapGroupIdToCopy: z.number()
});

export type CopyMetaSchema = typeof copyMetaSchema;

const mapJsonSchema = z.object({
  customCoordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
      heading: z.number(),
      pitch: z.number(),
      zoom: z.number(),
      panoId: z.string(),
      extra: z.object({
        tags: z.string().array().length(1),
        panoId: z.string().optional(),
        panoDate: z.string().optional().or(z.null())
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
  panoId: string;
  extraTag: string;
  extraPanoId: string | null;
  extraPanoDate: string | null | undefined;
  updatedAt: number;
  modifiedAt: number;
};

const metasUploadContentSchema = z
  .object({
    tagName: z.string(),
    metaName: z.string(),
    note: z.string(),
    levels: z.string().array().optional(),
    images: z.string().array().optional()
  })
  .array();
export type MetasUploadContentSchemaSafeParse = ReturnType<
  typeof metasUploadContentSchema.safeParse
>;
const metasUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' }),
  partialUpload: z.boolean().default(true)
});
export type MetasUploadSchema = typeof metasUploadSchema;

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }
  const id = getGroupId(params);
  await ensurePermissions(locals.user?.id, id);
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
  const user = await db.query.users.findFirst({ where: eq(users.id, locals.user!.id) });

  const metaForm = await superValidate(zod(insertMetasSchema));
  const mapUploadForm = await superValidate(zod(mapUploadSchema));
  const metasUploadForm = await superValidate(zod(metasUploadSchema));
  const imageUploadForm = await superValidate(zod(imageUploadSchema));
  const copyForm = await superValidate(zod(copyMetaSchema));

  const userGroups = await db
    .select({
      id: mapGroups.id,
      name: mapGroups.name
    })
    .from(mapGroups)
    .innerJoin(mapGroupPermissions, eq(mapGroupPermissions.mapGroupId, mapGroups.id))
    .where(eq(mapGroupPermissions.userId, locals.user.id));

  return {
    group,
    metaForm,
    levelList,
    mapUploadForm,
    metasUploadForm,
    imageUploadForm,
    user,
    userGroups,
    copyForm
  };
};

export const actions = {
  updateMeta: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertMetasSchema));

    if (!form.valid) {
      return fail(400, { form });
    }
    await ensurePermissions(locals.user?.id, form.data.mapGroupId);

    const { id, levels, ...dataNoId } = form.data;
    const noteHtml = String(
      await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeExternalLinks, { target: '_blank' })
        .use(rehypeStringify)
        .process(dataNoId.note)
    );
    const currentTimestamp = Math.floor(Date.now() / 1000);
    let metaId;

    if (id === undefined) {
      const insertResult = await db
        .insert(metas)
        .values({ ...form.data, noteHtml: noteHtml, modifiedAt: currentTimestamp })
        .returning({ insertedId: metas.id });
      metaId = insertResult[0].insertedId;
    } else {
      const savedData = await db.query.metas.findFirst({ where: eq(metas.id, id) });
      await ensurePermissions(locals.user?.id, savedData?.mapGroupId);
      await db
        .update(metas)
        .set({ ...dataNoId, noteHtml: noteHtml, modifiedAt: currentTimestamp })
        .where(eq(metas.id, id));
      metaId = id;
    }

    await db
      .delete(metaLevels)
      .where(and(eq(metaLevels.metaId, metaId), not(inArray(metaLevels.levelId, levels))));
    const levelsInsertValues = levels.map((levelId) => ({ levelId: levelId, metaId: metaId }));
    if (levelsInsertValues.length != 0) {
      await db.insert(metaLevels).values(levelsInsertValues).onConflictDoNothing();
    }
  },
  deleteMeta: async ({ request, locals }) => {
    const data = await request.formData();
    const metaId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(metaId)) {
      error(400, 'Invalid ID');
    }

    const meta = await db.query.metas.findFirst({ where: eq(metas.id, metaId) });
    await ensurePermissions(locals.user?.id, meta?.mapGroupId);

    await db.delete(metas).where(eq(metas.id, metaId));
  },
  copyMetaTo: async ({ request, locals }) => {
    const form = await superValidate(request, zod(copyMetaSchema));
    if (!form.valid) {
      return fail(400, { form });
    }
    const { metaId, mapGroupIdToCopy } = form.data;
    const meta = await db.query.metas.findFirst({ where: eq(metas.id, metaId) });
    if (!meta) {
      error(400, 'No meta found for this id');
    }
    await ensurePermissions(locals.user!.id, meta.mapGroupId);
    await ensurePermissions(locals.user!.id, mapGroupIdToCopy);
    const { id, mapGroupId, ...cleanedMeta } = meta;
    void id;
    const insertResult = await db
      .insert(metas)
      .values({
        ...cleanedMeta,
        mapGroupId: mapGroupIdToCopy
      })
      .onConflictDoNothing()
      .returning({ insertedId: metas.id });

    if (insertResult.length == 0) {
      return;
    }
    // copy images
    const sourceImages = await db
      .select({
        image_url: metaImages.image_url
      })
      .from(metaImages)
      .where(eq(metaImages.metaId, metaId));

    const sourceImagesInsert = sourceImages.map((sourceImage) => ({
      image_url: sourceImage.image_url,
      metaId: insertResult[0].insertedId
    }));
    if (sourceImagesInsert.length != 0) {
      await db.insert(metaImages).values(sourceImagesInsert).onConflictDoNothing();
    }

    const sourceLocations = await db
      .select({
        lat: mapGroupLocations.lat,
        lng: mapGroupLocations.lng,
        heading: mapGroupLocations.heading,
        pitch: mapGroupLocations.pitch,
        zoom: mapGroupLocations.zoom,
        panoId: mapGroupLocations.panoId,
        extraTag: mapGroupLocations.extraTag,
        extraPanoId: mapGroupLocations.extraPanoId,
        extraPanoDate: mapGroupLocations.extraPanoDate
      })
      .from(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, mapGroupId),
          eq(mapGroupLocations.extraTag, meta!.tagName)
        )
      );
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const insertLocations = sourceLocations.map((location) => ({
      ...location,
      mapGroupId: mapGroupIdToCopy,
      updatedAt: currentTimestamp,
      modifiedAt: currentTimestamp
    }));
    if (insertLocations.length != 0) {
      await db.insert(mapGroupLocations).values(insertLocations).onConflictDoNothing();
    }
  },
  uploadMapJson: async ({ request, params, locals }) => {
    const groupId = getGroupId(params);
    await ensurePermissions(locals.user?.id, groupId);
    const form = await superValidate(request, zod(mapUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    const jsonData = await extractJsonData(form.data.file);
    const validationResult = mapJsonSchema.safeParse(jsonData);
    let errorString = '';

    if (!validationResult.success) {
      for (const issue of validationResult.error.issues) {
        if (issue.code == 'invalid_type' && issue.path.includes('panoId')) {
          errorString = 'At least one of the locations is missing panoId.';
          break;
        }

        if (issue.code == 'too_small' && issue.path.includes('tags')) {
          errorString = 'At least one of the locations is missing tag.';
          break;
        }

        if (issue.code == 'too_big' && issue.path.includes('tags')) {
          errorString = 'At least one of the locations has more than one tag.';
          break;
        }

        errorString = "JSON doesn't match the expected format";
        break;
      }
      return setError(form, 'file', errorString);
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

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
        panoId: location.panoId,
        extraTag: location.extra.tags[0],
        extraPanoId: location.extra.panoId || null,
        extraPanoDate: location.extra.panoDate,
        updatedAt: currentTimestamp,
        modifiedAt: currentTimestamp // default value - not being set on conflict
      });
      usedTags.add(location.extra.tags[0]);
    });

    // upsert data
    const BATCH_SIZE = 1000;
    await db.transaction(async (trx) => {
      // Step 1: Batched upsert operation
      for (let i = 0; i < upsertValues.length; i += BATCH_SIZE) {
        const batch = upsertValues.slice(i, i + BATCH_SIZE);

        await trx
          .insert(mapGroupLocations)
          .values(batch)
          .onConflictDoUpdate({
            target: [mapGroupLocations.mapGroupId, mapGroupLocations.panoId],
            set: {
              heading: sql`excluded
              .
              heading`,
              pitch: sql`excluded
              .
              pitch`,
              zoom: sql`excluded
              .
              zoom`,
              panoId: sql`excluded
              .
              pano_id`,
              extraTag: sql`excluded
              .
              extra_tag`,
              extraPanoId: sql`excluded
              .
              extra_pano_id`,
              extraPanoDate: sql`excluded
              .
              extra_pano_date`,
              updatedAt: sql`excluded
              .
              updated_at`
            }
          })
          .returning({ id: mapGroupLocations.id });
      }

      // Step 2: Delete any records that weren't upserted

      if (!form.data.partialUpload) {
        await trx
          .delete(mapGroupLocations)
          .where(
            and(
              eq(mapGroupLocations.mapGroupId, groupId),
              or(
                isNull(mapGroupLocations.updatedAt),
                lt(mapGroupLocations.updatedAt, currentTimestamp)
              )
            )
          );
      }

      // Step 3: Insert tags into metas table
      const metaInsertValues = Array.from(usedTags).map((tagName) => ({
        mapGroupId: groupId,
        tagName: tagName,
        name: '',
        note: '',
        modifiedAt: currentTimestamp
      }));
      await trx.insert(metas).values(metaInsertValues).onConflictDoNothing();
    });
    return message(form, { numberOfLocations: upsertValues.length });
  },
  uploadMetas: async ({ request, params, locals }) => {
    const groupId = getGroupId(params);
    await ensurePermissions(locals.user!.id, groupId);
    const form = await superValidate(request, zod(metasUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    const jsonData = await extractJsonData(form.data.file);
    const validationResult = metasUploadContentSchema.safeParse(jsonData);

    if (!validationResult.success) {
      return setError(form, 'file', 'Validation failed');
    }

    try {
      await uploadMetas(groupId, validationResult, form.data.partialUpload);
    } catch (error) {
      if (error instanceof TransactionRollbackError) {
        return setError(form, 'file', 'Level not found - precreate all used levels');
      } else {
        throw error;
      }
    }
  },
  uploadMetaImages: async ({ request, locals }) => {
    const form = await superValidate(request, zod(imageUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    const meta = await db.query.metas.findFirst({ where: eq(metas.id, form.data.metaId) });
    await ensurePermissions(locals.user?.id, meta?.mapGroupId);

    const imageName = `${meta!.mapGroupId}/${generateRandomString(36)}.${getFileExtension(form.data.file)}`;
    await uploadFile(form.data.file, imageName);

    const url = `https://static${dev ? '-dev' : ''}.learnablemeta.com/${imageName}`;

    const result = await db
      .insert(metaImages)
      .values({ metaId: form.data.metaId, image_url: url })
      .returning({ id: metaImages.id, metaId: metaImages.metaId, image_url: metaImages.image_url });
    await db
      .update(metas)
      .set({ modifiedAt: Math.floor(Date.now() / 1000) })
      .where(eq(metas.id, form.data.metaId));
    return message(form, result[0]);
  },
  deleteMetaImage: async ({ request, locals }) => {
    const data = await request.formData();
    const imageId = parseInt((data.get('imageId') as string) || '', 10);
    if (isNaN(imageId)) {
      error(400, 'Invalid ID');
    }
    const savedImage = await db
      .select()
      .from(metaImages)
      .innerJoin(metas, eq(metas.id, metaImages.metaId))
      .where(eq(metaImages.id, imageId));
    await ensurePermissions(locals.user?.id, savedImage[0]?.metas.mapGroupId);

    await db.delete(metaImages).where(eq(metaImages.id, imageId));
    await db
      .update(metas)
      .set({ modifiedAt: Math.floor(Date.now() / 1000) })
      .where(eq(metas.id, savedImage[0].metas.id));
    return { success: true, imageId: imageId };
  },
  prepareUserScriptData: async (event) => {
    const groupId = getGroupId(event.params);
    await ensurePermissions(event.locals.user?.id, groupId);
    try {
      await syncUserScriptData(groupId);
      const TRAUSI_GROUP_ID = 1;
      let updateCount = 0;
      if (groupId == TRAUSI_GROUP_ID) {
        updateCount = await autoUpdateMaps(TRAUSI_GROUP_ID);
      }

      return {
        status: 200,
        updateCount
      };
    } catch (err) {
      const errorMessage = (err as Error).message || 'An error occurred';
      const errorStatus = (err as { status?: number }).status || 500;
      throw error(errorStatus, errorMessage);
    }
  },
  populateNotesHtml: async (event) => {
    const groupId = getGroupId(event.params);
    await ensurePermissions(event.locals.user?.id, groupId);

    const metaEntries = await db.query.metas.findMany({ where: eq(metas.mapGroupId, groupId) });

    for (const meta of metaEntries) {
      const html = await markdown2Html(meta.note);
      await db.update(metas).set({ noteHtml: html }).where(eq(metas.id, meta.id));
    }
  }
};
