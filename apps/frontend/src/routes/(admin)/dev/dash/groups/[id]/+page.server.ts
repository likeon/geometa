import type { PageServerLoad } from './$types';
import { and, asc, eq, isNull, lt, not, or, sql, TransactionRollbackError } from 'drizzle-orm';
import { mapGroupLocations, mapGroups, metaImages, metaLevels, metas, users } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
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
  .pick({
    id: true,
    mapGroupId: true,
    tagName: true,
    name: true,
    note: true,
    noteFromPlonkit: true
  })
  .extend({ levels: z.array(z.number()), footer: z.string().optional().default('') });
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
        panoId: z.string().optional().nullable(),
        panoDate: z.string().optional().nullable()
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
    footer: z.string().optional().nullable(),
    levels: z.string().array().optional().nullable(),
    images: z.string().array().optional().nullable()
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
  await ensurePermissions(locals.db, locals.user!.id, id);
  const [group, user] = await Promise.all([
    locals.db.query.mapGroups.findFirst({
      with: {
        metas: {
          orderBy: [asc(metas.id)],
          with: { metaLevels: { with: { level: true } }, images: true, locationsCount: true }
        },
        levels: true
      },
      where: eq(mapGroups.id, id),
      extras: {
        hasUnsycnedData: sql<boolean>`
        EXISTS (SELECT 1
         FROM map_group_locations mgl
         WHERE mgl.map_group_id = ${mapGroups.id}
           AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < mgl.modified_at))
        OR EXISTS(SELECT 1
         FROM metas m
         WHERE m.map_group_id = ${mapGroups.id} AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at)
        OR EXISTS(
         SELECT 1
         FROM maps m
         WHERE m.map_group_id = ${mapGroups.id} AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at)
        )
        )`.as('has_unsynced_data')
      }
    }),
    locals.db.query.users.findFirst({
      where: eq(users.id, locals.user!.id),
      with: { permissions: { with: { mapGroup: true } } }
    })
  ]);

  if (!group) {
    error(404, 'No group');
  }

  const metaForm = await superValidate(zod(insertMetasSchema));
  const mapUploadForm = await superValidate(zod(mapUploadSchema), { id: 'mapUpload' });
  const metasUploadForm = await superValidate(zod(metasUploadSchema));
  const imageUploadForm = await superValidate(zod(imageUploadSchema));
  const copyForm = await superValidate(zod(copyMetaSchema));

  return {
    group,
    metaForm,
    mapUploadForm,
    metasUploadForm,
    imageUploadForm,
    user,
    copyForm
  };
};

export const actions = {
  updateMeta: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertMetasSchema));

    if (!form.valid) {
      return fail(400, { form });
    }
    await ensurePermissions(locals.db, locals.user?.id, form.data.mapGroupId);

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
    const footerHtml = String(
      await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeExternalLinks, { target: '_blank' })
        .use(rehypeStringify)
        .process(dataNoId.footer)
    );
    const currentTimestamp = Math.floor(Date.now() / 1000);
    let metaId;

    if (id === undefined) {
      const insertResult = await locals.db
        .insert(metas)
        .values({ ...form.data, noteHtml, footerHtml: footerHtml, modifiedAt: currentTimestamp })
        .returning({ insertedId: metas.id });
      metaId = insertResult[0].insertedId;
    } else {
      const savedData = await locals.db.query.metas.findFirst({ where: eq(metas.id, id) });
      await ensurePermissions(locals.db, locals.user?.id, savedData?.mapGroupId);
      await locals.db
        .update(metas)
        .set({ ...dataNoId, noteHtml, footerHtml, modifiedAt: currentTimestamp })
        .where(eq(metas.id, id));
      metaId = id;
    }

    await locals.db
      .delete(metaLevels)
      .where(and(eq(metaLevels.metaId, metaId), not(inArray(metaLevels.levelId, levels))));
    const levelsInsertValues = levels.map((levelId) => ({ levelId: levelId, metaId: metaId }));
    if (levelsInsertValues.length != 0) {
      await locals.db.insert(metaLevels).values(levelsInsertValues).onConflictDoNothing();
    }
  },
  deleteMetas: async ({ request, locals }) => {
    const data = await request.formData();
    const idsRaw = data.getAll('id');
    const ids = idsRaw
      .flatMap((val) => (Array.isArray(val) ? val : [val]))
      .map((id) => parseInt(id as string, 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      error(400, 'No valid IDs provided');
    }
    const metasToDelete = await locals.db.query.metas.findMany({ where: inArray(metas.id, ids) });

    if (metasToDelete.length !== ids.length) {
      error(404, 'Some metas not found');
    }

    const mapGroupIds = [...new Set(metasToDelete.map((meta) => meta.mapGroupId))];

    if (mapGroupIds.length !== 1) {
      error(400, 'All metas must belong to the same map group');
    }
    await ensurePermissions(locals.db, locals.user?.id, mapGroupIds[0]);

    await locals.db.delete(metas).where(inArray(metas.id, ids));
  },
  copyMetaTo: async ({ request, locals }) => {
    const form = await superValidate(request, zod(copyMetaSchema));
    if (!form.valid) {
      return fail(400, { form });
    }
    const { metaId, mapGroupIdToCopy } = form.data;
    const meta = await locals.db.query.metas.findFirst({ where: eq(metas.id, metaId) });
    if (!meta) {
      error(400, 'No meta found for this id');
    }
    await ensurePermissions(locals.db, locals.user!.id, meta.mapGroupId);
    await ensurePermissions(locals.db, locals.user!.id, mapGroupIdToCopy);
    const { id, mapGroupId, ...cleanedMeta } = meta;
    void id;
    const insertResult = await locals.db
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
    const sourceImages = await locals.db
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
      await locals.db.insert(metaImages).values(sourceImagesInsert).onConflictDoNothing();
    }

    const sourceLocations = await locals.db
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
      await locals.db.insert(mapGroupLocations).values(insertLocations).onConflictDoNothing();
    }
  },
  uploadMapJson: async ({ request, params, locals }) => {
    const groupId = getGroupId(params);
    await ensurePermissions(locals.db, locals.user?.id, groupId);
    const form = await superValidate(request, zod(mapUploadSchema), { id: 'mapUpload' });
    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    const jsonData = await extractJsonData(form.data.file);
    const validationResult = mapJsonSchema.safeParse(jsonData);

    if (!validationResult.success) {
      const processedErrors = validationResult.error.issues.map((issue) => {
        let message: string = issue.message;
        if (issue.path.includes('tags')) {
          if (issue.code === 'too_small') {
            message = "Location doesn't have a tag";
          } else if (issue.code === 'too_big') {
            message = 'Location has more than one tag';
          }
        }
        return `${issue.path.join(' > ')}: ${message}`;
      });
      return setError(form, 'file', processedErrors);
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
    try {
      await locals.db.transaction(async (trx) => {
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
    } catch (error) {
      console.error('Error in uploadMapJson:', error);
      if (
        error instanceof Error &&
        error.message.includes('ON CONFLICT DO UPDATE command cannot affect row a second time')
      ) {
        return setError(
          form,
          'file',
          'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.'
        );
      }
      // Let other errors crash
      throw error;
    }
  },
  uploadMetas: async ({ request, params, locals }) => {
    const groupId = getGroupId(params);
    await ensurePermissions(locals.db, locals.user!.id, groupId);
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
      await uploadMetas(locals.db, groupId, validationResult, form.data.partialUpload);
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
    const meta = await locals.db.query.metas.findFirst({ where: eq(metas.id, form.data.metaId) });
    await ensurePermissions(locals.db, locals.user?.id, meta?.mapGroupId);

    const imageName = `${meta!.mapGroupId}/${generateRandomString(36)}.${getFileExtension(form.data.file)}`;
    await uploadFile(form.data.file, imageName);

    const url = `https://static${dev ? '-dev' : ''}.learnablemeta.com/${imageName}`;

    const result = await locals.db
      .insert(metaImages)
      .values({ metaId: form.data.metaId, image_url: url })
      .returning({ id: metaImages.id, metaId: metaImages.metaId, image_url: metaImages.image_url });
    await locals.db
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
    const savedImage = await locals.db
      .select()
      .from(metaImages)
      .innerJoin(metas, eq(metas.id, metaImages.metaId))
      .where(eq(metaImages.id, imageId));
    await ensurePermissions(locals.db, locals.user?.id, savedImage[0]?.metas.mapGroupId);

    await locals.db.delete(metaImages).where(eq(metaImages.id, imageId));
    await locals.db
      .update(metas)
      .set({ modifiedAt: Math.floor(Date.now() / 1000) })
      .where(eq(metas.id, savedImage[0].metas.id));
    return { success: true, imageId: imageId };
  },
  prepareUserScriptData: async (event) => {
    if (!['104498565430116352', '134938422182805504'].includes(event.locals.user!.id)) {
      throw error(503, 'Syncing is temporary disabled');
    }
    const groupId = getGroupId(event.params);
    await ensurePermissions(event.locals.db, event.locals.user?.id, groupId);
    try {
      await syncUserScriptData(event.locals.db, groupId);
      const TRAUSI_GROUP_ID = 1;
      let updateCount = 0;
      if (groupId == TRAUSI_GROUP_ID) {
        console.debug('TRYING TO UPDATE TRAUSI MAP GROUP IN GEOGUESSR');
        updateCount = await autoUpdateMaps(event.locals.db, TRAUSI_GROUP_ID);
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
    await ensurePermissions(event.locals.db, event.locals.user?.id, groupId);

    const metaEntries = await event.locals.db.query.metas.findMany({
      where: eq(metas.mapGroupId, groupId)
    });

    for (const meta of metaEntries) {
      const html = await markdown2Html(meta.note);
      await event.locals.db.update(metas).set({ noteHtml: html }).where(eq(metas.id, meta.id));
    }
  }
};
