import { and, asc, eq, isNull, lt, not, or, sql } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import {
  levels,
  mapGroupLocations,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { ensurePermissions, extractJsonData } from '$lib/utils';
import { getGroupId } from './utils';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeExternalLinks from 'rehype-external-links';
import { uploadMetas } from '$routes/(admin)/map-making/groups/[id]/metasUpload';
import { api, internalHeaders } from '$lib/api';
import {
  insertMetasSchema,
  mapUploadSchema,
  metasUploadContentSchema,
  metasUploadSchema
} from '$lib/form-schema';

const imageUploadSchema = z.object({
  metaId: z.number(),
  file: z.instanceof(File, { message: 'Please upload an image' })
});
export type ImageUploadSchema = typeof imageUploadSchema;

const imageOrderUpdateSchema = z.object({
  metaId: z.number(),
  updates: z
    .array(
      z.object({
        imageId: z.number(),
        order: z.number()
      })
    )
    .min(1, 'At least one image update is required')
});
export type ImageOrderUpdateSchema = typeof imageOrderUpdateSchema;

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

export const load = async ({ params, locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }
  const id = getGroupId(params);
  await ensurePermissions(locals.db, locals.user!.id, id);
  const [group, user] = await Promise.all([
    locals.db.query.mapGroups.findFirst({
      with: {
        metas: {
          orderBy: [asc(metas.tagName)],
          with: {
            metaLevels: { with: { level: true } },
            images: { orderBy: [asc(metaImages.order), asc(metaImages.id)] },
            locationsCount: true
          }
        },
        levels: {
          orderBy: [asc(levels.name)]
        }
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
  const mapUploadForm = await superValidate(zod(mapUploadSchema));
  const metasUploadForm = await superValidate(zod(metasUploadSchema));
  const imageUploadForm = await superValidate(zod(imageUploadSchema));
  const imageOrderUpdateForm = await superValidate(zod(imageOrderUpdateSchema));
  const copyForm = await superValidate(zod(copyMetaSchema));

  return {
    group,
    metaForm,
    mapUploadForm,
    metasUploadForm,
    imageUploadForm,
    imageOrderUpdateForm,
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
      try {
        const insertResult = await locals.db
          .insert(metas)
          .values({ ...form.data, noteHtml, footerHtml: footerHtml, modifiedAt: currentTimestamp })
          .returning({ insertedId: metas.id });
        metaId = insertResult[0].insertedId;
      } catch (error) {
        // For DrizzleQueryError, the underlying PostgreSQL error is in the cause property
        if (error instanceof DrizzleQueryError) {
          const pgError = error.cause as { constraint_name?: string };
          if (pgError?.constraint_name === 'metas_unique') {
            return setError(
              form,
              'tagName',
              'A meta with this tag name already exists in this map group'
            );
          }
        }
        throw error;
      }
    } else {
      const savedData = await locals.db.query.metas.findFirst({ where: eq(metas.id, id) });
      await ensurePermissions(locals.db, locals.user?.id, savedData?.mapGroupId);
      try {
        await locals.db
          .update(metas)
          .set({ ...dataNoId, noteHtml, footerHtml, modifiedAt: currentTimestamp })
          .where(eq(metas.id, id));
      } catch (error) {
        // For DrizzleQueryError, the underlying PostgreSQL error is in the cause property
        if (error instanceof DrizzleQueryError) {
          const pgError = error.cause as { constraint_name?: string };
          if (pgError?.constraint_name === 'metas_unique') {
            return setError(
              form,
              'tagName',
              'A meta with this tag name already exists in this map group'
            );
          }
        }
        throw error;
      }
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
  addLevels: async ({ request, locals }) => {
    const formData = await request.formData();
    const metaIds = formData.getAll('metaIds').map((id) => Number(id));
    const levelIds = formData.getAll('levelIds').map((id) => Number(id));

    if (!metaIds.length || !levelIds.length) {
      return fail(400, { message: 'No metas or levels selected' });
    }

    try {
      // Verify all metas exist and get their mapGroupIds for permission checking
      const selectedMetas = await locals.db.query.metas.findMany({
        where: inArray(metas.id, metaIds),
        columns: {
          id: true,
          mapGroupId: true,
          tagName: true
        }
      });

      if (selectedMetas.length !== metaIds.length) {
        return fail(404, { message: 'Some metas not found' });
      }

      // Check permissions for all map groups
      const uniqueMapGroupIds = [...new Set(selectedMetas.map((meta) => meta.mapGroupId))];
      for (const mapGroupId of uniqueMapGroupIds) {
        await ensurePermissions(locals.db, locals.user!.id, mapGroupId);
      }

      // Verify all levels exist and belong to the same map groups
      const selectedLevels = await locals.db.query.levels.findMany({
        where: and(inArray(levels.id, levelIds), inArray(levels.mapGroupId, uniqueMapGroupIds)),
        columns: {
          id: true,
          mapGroupId: true,
          name: true
        }
      });

      if (selectedLevels.length === 0) {
        return fail(400, {
          message: 'Invalid levels selected or levels do not belong to the correct map groups'
        });
      }

      // Get existing meta-level associations to avoid duplicates
      const existingMetaLevels = await locals.db
        .select({
          metaId: metaLevels.metaId,
          levelId: metaLevels.levelId
        })
        .from(metaLevels)
        .where(and(inArray(metaLevels.metaId, metaIds), inArray(metaLevels.levelId, levelIds)));

      // Create a set of existing combinations for quick lookup
      const existingCombinations = new Set(
        existingMetaLevels.map((ml) => `${ml.metaId}-${ml.levelId}`)
      );

      // Prepare insert data, filtering out existing combinations
      const metaLevelInserts = [];
      for (const metaId of metaIds) {
        const meta = selectedMetas.find((m) => m.id === metaId);
        if (!meta) continue;

        for (const levelId of levelIds) {
          const level = selectedLevels.find((l) => l.id === levelId);
          if (!level) continue;

          // Only add if this level belongs to the same map group as the meta
          if (level.mapGroupId !== meta.mapGroupId) continue;

          // Skip if this combination already exists
          if (existingCombinations.has(`${metaId}-${levelId}`)) continue;

          metaLevelInserts.push({
            metaId,
            levelId
          });
        }
      }

      if (metaLevelInserts.length === 0) {
        return {
          success: true,
          message: 'No new levels to add (all selected levels already assigned or invalid)',
          addedCount: 0
        };
      }

      // Insert the new meta-level associations
      await locals.db.insert(metaLevels).values(metaLevelInserts).onConflictDoNothing(); // Extra safety in case of race conditions

      // Update modifiedAt for affected metas
      const currentTimestamp = Math.floor(Date.now() / 1000);
      await locals.db
        .update(metas)
        .set({ modifiedAt: currentTimestamp })
        .where(inArray(metas.id, metaIds));

      // Mark map group as having unsynced data
      for (const mapGroupId of uniqueMapGroupIds) {
        await locals.db
          .update(mapGroups)
          .set({ syncedAt: null })
          .where(eq(mapGroups.id, mapGroupId));
      }

      return {
        success: true,
        message: `Successfully added ${metaLevelInserts.length} level assignments to ${metaIds.length} metas`,
        addedCount: metaLevelInserts.length
      };
    } catch (error) {
      console.error('Error adding levels to metas:', error);
      return fail(500, { message: 'Failed to add levels to metas' });
    }
  },
  shareMetas: async ({ request, locals }) => {
    const formData = await request.formData();
    const metaIds = formData.getAll('metaIds').map((id) => Number(id));
    const targetGroupId = Number(formData.get('targetGroupId'));

    if (!metaIds.length || !targetGroupId) {
      return fail(400, { message: 'Invalid request data' });
    }

    // Batch fetch all metas
    const metasToShare = await locals.db.query.metas.findMany({
      where: inArray(metas.id, metaIds)
    });

    if (metasToShare.length === 0) {
      return fail(404, { message: 'No metas found for the provided IDs' });
    }

    // Check permissions for source groups and target group
    const uniqueSourceGroupIds = [...new Set(metasToShare.map((meta) => meta.mapGroupId))];
    for (const groupId of uniqueSourceGroupIds) {
      await ensurePermissions(locals.db, locals.user!.id, groupId);
    }
    await ensurePermissions(locals.db, locals.user!.id, targetGroupId);

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const successfulCopies: number[] = [];

    // Process each meta
    for (const meta of metasToShare) {
      const { id, mapGroupId, ...cleanedMeta } = meta;

      try {
        // Insert the meta
        const insertResult = await locals.db
          .insert(metas)
          .values({
            ...cleanedMeta,
            mapGroupId: targetGroupId,
            modifiedAt: currentTimestamp
          })
          .onConflictDoNothing()
          .returning({ insertedId: metas.id });

        if (insertResult.length === 0) {
          continue; // Skip if meta already exists
        }

        const newMetaId = insertResult[0].insertedId;
        successfulCopies.push(id);

        // Copy images
        const sourceImages = await locals.db
          .select({
            image_url: metaImages.image_url
          })
          .from(metaImages)
          .where(eq(metaImages.metaId, id));

        if (sourceImages.length > 0) {
          const imageInserts = sourceImages.map((sourceImage) => ({
            image_url: sourceImage.image_url,
            metaId: newMetaId
          }));

          await locals.db.insert(metaImages).values(imageInserts).onConflictDoNothing();
        }

        // Copy locations
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
              eq(mapGroupLocations.extraTag, meta.tagName)
            )
          );

        if (sourceLocations.length > 0) {
          const locationInserts = sourceLocations.map((location) => ({
            ...location,
            mapGroupId: targetGroupId,
            updatedAt: currentTimestamp,
            modifiedAt: currentTimestamp
          }));

          await locals.db.insert(mapGroupLocations).values(locationInserts).onConflictDoNothing();
        }

        // Copy meta levels (if your schema includes this relationship)
        const sourceMetaLevels = await locals.db
          .select({
            levelId: metaLevels.levelId
          })
          .from(metaLevels)
          .where(eq(metaLevels.metaId, id));

        if (sourceMetaLevels.length > 0) {
          const metaLevelInserts = sourceMetaLevels.map((ml) => ({
            metaId: newMetaId,
            levelId: ml.levelId
          }));

          await locals.db.insert(metaLevels).values(metaLevelInserts).onConflictDoNothing();
        }
      } catch (error) {
        console.error(`Failed to copy meta ${id}:`, error);
        // Continue with other metas even if one fails
      }
    }

    return {
      success: true,
      copiedCount: successfulCopies.length,
      totalRequested: metaIds.length,
      message: `Successfully shared ${successfulCopies.length} of ${metaIds.length} metas`
    };
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
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const insertResult = await locals.db
      .insert(metas)
      .values({
        ...cleanedMeta,
        mapGroupId: mapGroupIdToCopy,
        modifiedAt: currentTimestamp
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
        } else if (
          issue.path.includes('panoId') &&
          issue.message === 'Expected string, received null'
        ) {
          message = "Location doesn't have panoId";
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
        if (usedTags.size > 0) {
          const metaInsertValues = Array.from(usedTags).map((tagName) => ({
            mapGroupId: groupId,
            tagName: tagName,
            name: '',
            note: '',
            modifiedAt: currentTimestamp
          }));
          await trx.insert(metas).values(metaInsertValues).onConflictDoNothing();
        }
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

    // Check for duplicate tagNames
    const tagNameCounts = new Map<string, number>();
    for (const item of validationResult.data!) {
      const count = tagNameCounts.get(item.tagName) || 0;
      tagNameCounts.set(item.tagName, count + 1);
    }

    const duplicates = Array.from(tagNameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([tagName, count]) => `${tagName} (${count} times)`);

    if (duplicates.length > 0) {
      return setError(
        form,
        'file',
        `Duplicate tagNames found: ${duplicates.join(', ')}. Each tagName must be unique.`
      );
    }

    try {
      await uploadMetas(
        locals.db,
        groupId,
        validationResult,
        form.data.partialUpload,
        form.data.autoCreateLevels
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Missing levels:')) {
        return setError(form, 'file', error.message);
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

    const { data, status } = await api.internal
      .metas({ id: form.data.metaId })
      .images.post({ file: form.data.file }, internalHeaders(locals));

    switch (status) {
      case 200:
        return message(form, data!.imageUrl);
      case 400:
        return setError(form, 'file', 'Failed to process the image');
      default:
        console.debug(status);
        throw new Error('unexpected response');
    }
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
  updateImageOrder: async ({ request, locals }) => {
    const form = await superValidate(request, zod(imageOrderUpdateSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Call the internal API to update image order
    const { error: apiError } = await api.internal
      .metas({ id: form.data.metaId })
      .images.order.put({ updates: form.data.updates }, internalHeaders(locals));

    if (apiError) {
      console.error('Failed to update image order:', apiError);
      return setError(form, '', 'Failed to update image order');
    }

    return message(form, 'Image order updated successfully');
  },
  prepareUserScriptData: async (event) => {
    const groupId = getGroupId(event.params);
    // make it so every request has this user id as header
    const { error: apiError } = await api.internal['map-groups']({ id: groupId }).sync.post(
      undefined,
      {
        headers: {
          'x-api-user-id': event.locals.user!.id
        }
      }
    );
    if (apiError) {
      error(500);
    }
  }
};
