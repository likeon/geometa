import {
  levels,
  type Meta,
  mapGroupLocationMetas,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { logChange, metaSnapshot } from '@api/lib/internal/changes';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { generateRandomString, isUniqueViolation } from '@api/lib/utils/common';
import {
  GeoJsonValidationError,
  MAX_GEOJSON_BYTES,
  normalizeGeoJson,
  summarizeGeoJson,
} from '@api/lib/utils/geojson';
import { markdown2Html } from '@api/lib/utils/markdown';
import { uploadImage } from '@api/lib/utils/s3';
import { and, eq, inArray, not, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import sharp from 'sharp';

type Tx = Parameters<Parameters<typeof db.$primary.transaction>[0]>[0];

function authorizedMetaMutation(userId: string, mapGroupId: number) {
  return and(
    eq(metas.mapGroupId, mapGroupId),
    sql`(
      EXISTS (
        SELECT 1 FROM ${mapGroupPermissions}
        WHERE ${mapGroupPermissions.mapGroupId} = ${metas.mapGroupId}
          AND ${mapGroupPermissions.userId} = ${userId}
      )
      OR EXISTS (
        SELECT 1 FROM ${users}
        WHERE ${users.id} = ${userId}
          AND ${users.isSuperadmin} = true
      )
    )`,
  );
}

// Copies a meta (its images, its tag's locations, and optionally its level
// assignments) into another group inside the given transaction. Returns the new
// meta id, or null if one with the same tag already existed there.
// copyLevels is false for /copy and true for /share, preserving their behaviors.
async function copyMetaToGroup(
  tx: Tx,
  meta: Meta,
  targetGroupId: number,
  currentTimestamp: number,
  copyLevels: boolean,
): Promise<number | null> {
  const { id, mapGroupId, ...cleanedMeta } = meta;

  const insertResult = await tx
    .insert(metas)
    .values({
      ...cleanedMeta,
      mapGroupId: targetGroupId,
      modifiedAt: currentTimestamp,
    })
    .onConflictDoNothing()
    .returning({ insertedId: metas.id });
  if (insertResult.length === 0) {
    return null;
  }
  const newMetaId = insertResult[0].insertedId;

  const sourceImages = await tx
    .select({ image_url: metaImages.image_url })
    .from(metaImages)
    .where(eq(metaImages.metaId, id));
  if (sourceImages.length > 0) {
    await tx
      .insert(metaImages)
      .values(
        sourceImages.map((sourceImage) => ({
          image_url: sourceImage.image_url,
          metaId: newMetaId,
        })),
      )
      .onConflictDoNothing();
  }

  // Set-based so a meta with tens of thousands of locations can't blow the
  // bind-parameter limit. Only locations this copy actually inserts get
  // linked: a pano the target group already has belongs to some other meta
  // there, framed for that meta, and hijacking it would hand the copied meta
  // a mis-aimed round (the old per-row copy skipped those too).
  await tx.execute(sql`
    WITH inserted AS (
      INSERT INTO ${mapGroupLocations}
        (map_group_id, lat, lng, heading, pitch, zoom, pano_id, extra_tag,
         extra_pano_id, extra_pano_date, updated_at, modified_at)
      SELECT ${targetGroupId}, src.lat, src.lng, src.heading, src.pitch, src.zoom,
             src.pano_id, ${meta.tagName}, src.extra_pano_id, src.extra_pano_date,
             ${currentTimestamp}, ${currentTimestamp}
      FROM ${mapGroupLocations} src
        JOIN ${mapGroupLocationMetas} lm ON lm.location_id = src.id
      WHERE src.map_group_id = ${mapGroupId} AND lm.meta_id = ${id}
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    INSERT INTO ${mapGroupLocationMetas} (location_id, meta_id)
    SELECT inserted.id, ${newMetaId} FROM inserted
    ON CONFLICT DO NOTHING
  `);

  if (copyLevels) {
    const sourceMetaLevels = await tx
      .select({ levelId: metaLevels.levelId })
      .from(metaLevels)
      .where(eq(metaLevels.metaId, id));
    if (sourceMetaLevels.length > 0) {
      await tx
        .insert(metaLevels)
        .values(
          sourceMetaLevels.map((ml) => ({
            metaId: newMetaId,
            levelId: ml.levelId,
          })),
        )
        .onConflictDoNothing();
    }
  }

  return newMetaId;
}

class ImageNotFoundError extends Error {
  constructor(imageId: number, metaId: number) {
    super(`Image with id ${imageId} not found for meta ${metaId}.`);
  }
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arr = await file.arrayBuffer();
  return Buffer.from(arr);
}

export const metasRouter = new Elysia({ prefix: '/metas' })
  .use(auth())
  .post(
    '/:id/images',
    async ({ body, userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });
      if (!meta) {
        return status(404, undefined);
      }

      await ensurePermissions(userId, meta.mapGroupId);

      let avifFile: Buffer;
      try {
        avifFile = await sharp(await fileToBuffer(body.file))
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .avif({
            quality: 70,
          })
          .toBuffer();
      } catch (_e) {
        return status(400, undefined);
      }

      const imageName = `${Date.now()}-${generateRandomString(3)}.avif`;
      const imageUrl = await uploadImage(
        avifFile.buffer as ArrayBuffer,
        `${meta.mapGroupId}/${imageName}`,
      );
      await db.$primary.transaction(async (tx) => {
        await tx
          .insert(metaImages)
          .values({ metaId: params.id, image_url: imageUrl })
          .returning({
            id: metaImages.id,
            metaId: metaImages.metaId,
            image_url: metaImages.image_url,
          });
        await tx
          .update(metas)
          .set({ modifiedAt: Math.floor(Date.now() / 1000) })
          .where(eq(metas.id, params.id));
        await logChange(tx, {
          mapGroupId: meta.mapGroupId,
          userId,
          entityType: 'meta_image',
          entityId: meta.id,
          entityLabel: meta.tagName,
          operation: 'create',
          newValue: { imageUrl },
        });
      });
      return {
        imageUrl: imageUrl,
      };
    },
    {
      body: t.Object({
        file: t.File({ format: 'image/*' }),
      }),
      userId: true,
      params: t.Object({
        id: t.Integer(),
      }),
      response: {
        200: t.Object({
          imageUrl: t.String(),
        }),
        400: t.Void(),
        404: t.Void(),
      },
    },
  )
  .error({ ImageNotFoundError })
  .onError(({ code, status }) => {
    if (code === 'ImageNotFoundError') {
      return status(404);
    }
  })
  .put(
    '/:id/images/order',
    async ({ body, userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });

      if (!meta) {
        return status(404, undefined);
      }

      await ensurePermissions(userId, meta.mapGroupId);

      await db.$primary.transaction(async (tx) => {
        for (const item of body.updates) {
          const result = await tx
            .update(metaImages)
            .set({ order: item.order })
            .where(
              and(
                eq(metaImages.id, item.imageId),
                eq(metaImages.metaId, params.id),
              ),
            )
            .returning({ id: metaImages.id });

          if (result.length === 0) {
            // throw to rollback transaction
            throw new ImageNotFoundError(item.imageId, params.id);
          }
        }

        await tx
          .update(metas)
          .set({ modifiedAt: Math.floor(Date.now() / 1000) })
          .where(eq(metas.id, params.id));
        await logChange(tx, {
          mapGroupId: meta.mapGroupId,
          userId,
          entityType: 'meta_image',
          entityId: meta.id,
          entityLabel: meta.tagName,
          operation: 'update',
          newValue: { reorderedImages: body.updates.length },
        });
      });

      return status(200, { message: 'Image order updated successfully.' });
    },
    {
      body: t.Object({
        updates: t.Array(
          t.Object({
            imageId: t.Integer(),
            order: t.Integer(),
          }),
          { minItems: 1 },
        ),
      }),
      userId: true,
      params: t.Object({
        id: t.Integer(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
        }),
        404: t.Void(),
      },
    },
  )
  .get(
    '/:id/geojson',
    async ({ userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });
      if (!meta) {
        return status(404, { message: 'Meta not found' });
      }
      await ensurePermissions(userId, meta.mapGroupId);
      if (!meta.geoJson) {
        return status(404, { message: 'Map area not found' });
      }
      return meta.geoJson;
    },
    {
      userId: true,
      params: t.Object({ id: t.Integer() }),
      response: {
        200: t.Any(),
        404: t.Object({ message: t.String() }),
      },
    },
  )
  .put(
    '/:id/geojson',
    async ({ body, userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });
      if (!meta) {
        return status(404, { message: 'Meta not found' });
      }
      await ensurePermissions(userId, meta.mapGroupId);

      if (body.file.size > MAX_GEOJSON_BYTES) {
        return status(400, { message: 'GeoJSON must be 5 MiB or smaller' });
      }

      let input: unknown;
      try {
        input = JSON.parse(await body.file.text());
      } catch {
        return status(400, { message: 'File is not valid JSON' });
      }

      let geoJson: ReturnType<typeof normalizeGeoJson>;
      try {
        geoJson = normalizeGeoJson(input);
      } catch (error) {
        if (error instanceof GeoJsonValidationError) {
          return status(400, { message: error.message });
        }
        throw error;
      }

      const summary = summarizeGeoJson(geoJson);
      const saved = await db.$primary.transaction(async (tx) => {
        await tx
          .select({ id: mapGroups.id })
          .from(mapGroups)
          .where(eq(mapGroups.id, meta.mapGroupId))
          .for('update');
        const updated = await tx
          .update(metas)
          .set({
            geoJson,
            modifiedAt: Math.floor(Date.now() / 1000),
          })
          .where(
            and(
              eq(metas.id, meta.id),
              authorizedMetaMutation(userId, meta.mapGroupId),
            ),
          )
          .returning({ id: metas.id });
        if (updated.length === 0) return false;
        await logChange(tx, {
          mapGroupId: meta.mapGroupId,
          userId,
          entityType: 'meta_geojson',
          entityId: meta.id,
          entityLabel: meta.tagName,
          operation: meta.geoJson ? 'update' : 'create',
          newValue: summary,
        });
        return true;
      });
      if (!saved) return status(404, { message: 'Meta not found' });
      return summary;
    },
    {
      body: t.Object({ file: t.File() }),
      userId: true,
      params: t.Object({ id: t.Integer() }),
      response: {
        200: t.Object({
          featureCount: t.Integer(),
          polygonCount: t.Integer(),
        }),
        400: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
      },
    },
  )
  .delete(
    '/:id/geojson',
    async ({ userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });
      if (!meta) {
        return status(404, { message: 'Meta not found' });
      }
      await ensurePermissions(userId, meta.mapGroupId);
      const geoJson = meta.geoJson;
      if (!geoJson) {
        return status(404, { message: 'Map area not found' });
      }

      const deleted = await db.$primary.transaction(async (tx) => {
        await tx
          .select({ id: mapGroups.id })
          .from(mapGroups)
          .where(eq(mapGroups.id, meta.mapGroupId))
          .for('update');
        const updated = await tx
          .update(metas)
          .set({
            geoJson: null,
            modifiedAt: Math.floor(Date.now() / 1000),
          })
          .where(
            and(
              eq(metas.id, meta.id),
              authorizedMetaMutation(userId, meta.mapGroupId),
            ),
          )
          .returning({ id: metas.id });
        if (updated.length === 0) return false;
        await logChange(tx, {
          mapGroupId: meta.mapGroupId,
          userId,
          entityType: 'meta_geojson',
          entityId: meta.id,
          entityLabel: meta.tagName,
          operation: 'delete',
          oldValue: summarizeGeoJson(geoJson),
        });
        return true;
      });
      if (!deleted) return status(404, { message: 'Meta not found' });
      return { deleted: true };
    },
    {
      userId: true,
      params: t.Object({ id: t.Integer() }),
      response: {
        200: t.Object({ deleted: t.Boolean() }),
        404: t.Object({ message: t.String() }),
      },
    },
  )
  .put(
    '/',
    async ({ body, userId, status }) => {
      await ensurePermissions(userId, body.mapGroupId);

      const { id, levels: levelIds, ...dataNoId } = body;
      const noteHtml = await markdown2Html(dataNoId.note);
      const footerHtml = await markdown2Html(dataNoId.footer);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const groupLevels = await db.$primary.query.levels.findMany({
        where: eq(levels.mapGroupId, body.mapGroupId),
        columns: { id: true, name: true },
      });
      const levelNameById = new Map(
        groupLevels.map((level) => [level.id, level.name]),
      );
      const levelNames = (ids: number[]) =>
        ids
          .map((levelId) => levelNameById.get(levelId) ?? `#${levelId}`)
          .sort();

      let savedData: Meta | undefined;
      let savedLevelIds: number[] = [];
      if (id !== undefined) {
        savedData = await db.$primary.query.metas.findFirst({
          where: eq(metas.id, id),
        });
        if (!savedData) {
          return status(404);
        }
        await ensurePermissions(userId, savedData.mapGroupId);
        savedLevelIds = (
          await db.$primary
            .select({ levelId: metaLevels.levelId })
            .from(metaLevels)
            .where(eq(metaLevels.metaId, id))
        ).map((row) => row.levelId);
        if (savedData.mapGroupId !== body.mapGroupId) {
          // the old level assignments belong to the source group
          const sourceGroupLevels = await db.$primary.query.levels.findMany({
            where: eq(levels.mapGroupId, savedData.mapGroupId),
            columns: { id: true, name: true },
          });
          for (const level of sourceGroupLevels) {
            levelNameById.set(level.id, level.name);
          }
        }
      }

      try {
        const metaId = await db.$primary.transaction(async (tx) => {
          let metaId: number;
          if (id === undefined) {
            const insertResult = await tx
              .insert(metas)
              .values({
                ...dataNoId,
                noteHtml,
                footerHtml,
                modifiedAt: currentTimestamp,
              })
              .returning({ insertedId: metas.id });
            metaId = insertResult[0].insertedId;
          } else {
            await tx
              .update(metas)
              .set({
                ...dataNoId,
                noteHtml,
                footerHtml,
                modifiedAt: currentTimestamp,
              })
              .where(eq(metas.id, id));
            metaId = id;
          }

          await tx
            .delete(metaLevels)
            .where(
              and(
                eq(metaLevels.metaId, metaId),
                not(inArray(metaLevels.levelId, levelIds)),
              ),
            );
          if (levelIds.length !== 0) {
            await tx
              .insert(metaLevels)
              .values(levelIds.map((levelId) => ({ levelId, metaId })))
              .onConflictDoNothing();
          }
          const oldSnapshot = savedData
            ? {
                ...metaSnapshot(savedData),
                levels: levelNames(savedLevelIds),
              }
            : null;
          const newSnapshot = {
            ...metaSnapshot(dataNoId),
            levels: levelNames(levelIds),
          };
          if (savedData && savedData.mapGroupId !== body.mapGroupId) {
            // moved between groups: log the departure and the arrival
            await logChange(tx, [
              {
                mapGroupId: savedData.mapGroupId,
                userId,
                entityType: 'meta',
                entityId: metaId,
                entityLabel: savedData.tagName,
                operation: 'delete',
                oldValue: oldSnapshot,
                newValue: { movedToGroupId: body.mapGroupId },
              },
              {
                mapGroupId: body.mapGroupId,
                userId,
                entityType: 'meta',
                entityId: metaId,
                entityLabel: dataNoId.tagName,
                operation: 'create',
                newValue: {
                  ...newSnapshot,
                  movedFromGroupId: savedData.mapGroupId,
                },
              },
            ]);
          } else {
            await logChange(tx, {
              mapGroupId: body.mapGroupId,
              userId,
              entityType: 'meta',
              entityId: metaId,
              entityLabel: dataNoId.tagName,
              operation: id === undefined ? 'create' : 'update',
              oldValue: oldSnapshot,
              newValue: newSnapshot,
            });
          }
          return metaId;
        });
        return { id: metaId };
      } catch (error) {
        if (isUniqueViolation(error, 'metas_unique')) {
          return status(409, {
            message:
              'A meta with this tag name already exists in this map group',
          });
        }
        throw error;
      }
    },
    {
      body: t.Object({
        id: t.Optional(t.Integer()),
        mapGroupId: t.Integer(),
        tagName: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        note: t.String(),
        noteFromPlonkit: t.Boolean(),
        levels: t.Array(t.Integer()),
        footer: t.String(),
      }),
      userId: true,
    },
  )
  .delete(
    '/',
    async ({ body, userId, status }) => {
      const metasToDelete = await db.$primary.query.metas.findMany({
        where: inArray(metas.id, body.ids),
      });

      if (metasToDelete.length !== body.ids.length) {
        return status(404, 'Some metas not found');
      }

      const mapGroupIds = [
        ...new Set(metasToDelete.map((meta) => meta.mapGroupId)),
      ];
      if (mapGroupIds.length !== 1) {
        return status(400, 'All metas must belong to the same map group');
      }
      await ensurePermissions(userId, mapGroupIds[0]);

      await db.$primary.transaction(async (tx) => {
        await tx.delete(metas).where(inArray(metas.id, body.ids));
        await logChange(
          tx,
          metasToDelete.map((meta) => ({
            mapGroupId: meta.mapGroupId,
            userId,
            entityType: 'meta' as const,
            entityId: meta.id,
            entityLabel: meta.tagName,
            operation: 'delete' as const,
            oldValue: metaSnapshot(meta),
          })),
        );
      });
      return status(200);
    },
    {
      body: t.Object({
        ids: t.Array(t.Integer(), { minItems: 1 }),
      }),
      userId: true,
    },
  )
  .post(
    '/levels',
    async ({ body, userId, status }) => {
      const { metaIds, levelIds } = body;

      const selectedMetas = await db.$primary.query.metas.findMany({
        where: inArray(metas.id, metaIds),
        columns: { id: true, mapGroupId: true, tagName: true },
      });

      if (selectedMetas.length !== metaIds.length) {
        return status(404, { message: 'Some metas not found' });
      }

      const uniqueMapGroupIds = [
        ...new Set(selectedMetas.map((meta) => meta.mapGroupId)),
      ];
      for (const mapGroupId of uniqueMapGroupIds) {
        await ensurePermissions(userId, mapGroupId);
      }

      const selectedLevels = await db.$primary.query.levels.findMany({
        where: and(
          inArray(levels.id, levelIds),
          inArray(levels.mapGroupId, uniqueMapGroupIds),
        ),
        columns: { id: true, mapGroupId: true, name: true },
      });

      if (selectedLevels.length === 0) {
        return status(400, {
          message:
            'Invalid levels selected or levels do not belong to the correct map groups',
        });
      }

      // pair every meta with the selected levels of its own group; the unique
      // index dedupes already-assigned pairs via onConflictDoNothing
      const metaById = new Map(selectedMetas.map((meta) => [meta.id, meta]));
      const levelById = new Map(
        selectedLevels.map((level) => [level.id, level]),
      );
      const metaLevelInserts: { metaId: number; levelId: number }[] = [];
      for (const metaId of metaIds) {
        const meta = metaById.get(metaId);
        if (!meta) continue;

        for (const levelId of levelIds) {
          const level = levelById.get(levelId);
          if (level && level.mapGroupId === meta.mapGroupId) {
            metaLevelInserts.push({ metaId, levelId });
          }
        }
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const addedCount = await db.$primary.transaction(async (tx) => {
        const inserted = metaLevelInserts.length
          ? await tx
              .insert(metaLevels)
              .values(metaLevelInserts)
              .onConflictDoNothing()
              .returning({
                metaId: metaLevels.metaId,
                levelId: metaLevels.levelId,
              })
          : [];
        if (inserted.length === 0) {
          return 0;
        }
        await tx
          .update(metas)
          .set({ modifiedAt: currentTimestamp })
          .where(inArray(metas.id, metaIds));
        await tx
          .update(mapGroups)
          .set({ syncedAt: null })
          .where(inArray(mapGroups.id, uniqueMapGroupIds));
        const insertedMetaIds = new Set(inserted.map((row) => row.metaId));
        const insertedLevelIds = new Set(inserted.map((row) => row.levelId));
        await logChange(
          tx,
          uniqueMapGroupIds.flatMap((mapGroupId) => {
            const groupMetas = selectedMetas.filter(
              (meta) =>
                meta.mapGroupId === mapGroupId && insertedMetaIds.has(meta.id),
            );
            if (groupMetas.length === 0) {
              return [];
            }
            return [
              {
                mapGroupId,
                userId,
                entityType: 'meta_levels' as const,
                entityLabel: `${groupMetas.length} metas`,
                operation: 'update' as const,
                newValue: {
                  metaTags: groupMetas.map((meta) => meta.tagName),
                  levelNames: selectedLevels
                    .filter(
                      (level) =>
                        level.mapGroupId === mapGroupId &&
                        insertedLevelIds.has(level.id),
                    )
                    .map((level) => level.name),
                },
              },
            ];
          }),
        );
        return inserted.length;
      });

      if (addedCount === 0) {
        return {
          message:
            'No new levels to add (all selected levels already assigned or invalid)',
          addedCount: 0,
        };
      }

      return {
        message: `Successfully added ${addedCount} level assignments to ${metaIds.length} metas`,
        addedCount,
      };
    },
    {
      body: t.Object({
        metaIds: t.Array(t.Integer(), { minItems: 1 }),
        levelIds: t.Array(t.Integer(), { minItems: 1 }),
      }),
      userId: true,
    },
  )
  .post(
    '/share',
    async ({ body, userId, status }) => {
      const { metaIds, targetGroupId } = body;

      const metasToShare = await db.$primary.query.metas.findMany({
        where: inArray(metas.id, metaIds),
      });

      if (metasToShare.length === 0) {
        return status(404, {
          message: 'No metas found for the provided IDs',
        });
      }

      const uniqueSourceGroupIds = [
        ...new Set(metasToShare.map((meta) => meta.mapGroupId)),
      ];
      for (const groupId of uniqueSourceGroupIds) {
        await ensurePermissions(userId, groupId);
      }
      await ensurePermissions(userId, targetGroupId);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const successfulCopies: number[] = [];

      for (const meta of metasToShare) {
        try {
          const newMetaId = await db.$primary.transaction(async (tx) => {
            const insertedId = await copyMetaToGroup(
              tx,
              meta,
              targetGroupId,
              currentTimestamp,
              true,
            );
            if (insertedId !== null) {
              await logChange(tx, {
                mapGroupId: targetGroupId,
                userId,
                entityType: 'meta',
                entityId: insertedId,
                entityLabel: meta.tagName,
                operation: 'create',
                newValue: {
                  ...metaSnapshot(meta),
                  sharedFromGroupId: meta.mapGroupId,
                },
              });
            }
            return insertedId;
          });
          // count only after the transaction commits, so a rollback isn't reported as success
          if (newMetaId !== null) {
            successfulCopies.push(meta.id);
          }
        } catch (error) {
          console.error(`Failed to copy meta ${meta.id}:`, error);
          // Continue with other metas even if one fails
        }
      }

      return {
        copiedCount: successfulCopies.length,
        totalRequested: metaIds.length,
        message: `Successfully shared ${successfulCopies.length} of ${metaIds.length} metas`,
      };
    },
    {
      body: t.Object({
        metaIds: t.Array(t.Integer(), { minItems: 1 }),
        targetGroupId: t.Integer(),
      }),
      userId: true,
    },
  )
  .post(
    '/copy',
    async ({ body, userId, status }) => {
      const { metaId, targetGroupId } = body;

      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, metaId),
      });
      if (!meta) {
        return status(404, 'No meta found for this id');
      }
      await ensurePermissions(userId, meta.mapGroupId);
      await ensurePermissions(userId, targetGroupId);

      const currentTimestamp = Math.floor(Date.now() / 1000);

      // copyLevels is false here: /copy intentionally does not copy level assignments
      await db.$primary.transaction(async (tx) => {
        const insertedId = await copyMetaToGroup(
          tx,
          meta,
          targetGroupId,
          currentTimestamp,
          false,
        );
        if (insertedId !== null) {
          await logChange(tx, {
            mapGroupId: targetGroupId,
            userId,
            entityType: 'meta',
            entityId: insertedId,
            entityLabel: meta.tagName,
            operation: 'create',
            newValue: {
              ...metaSnapshot(meta),
              sharedFromGroupId: meta.mapGroupId,
            },
          });
        }
      });
      return status(200);
    },
    {
      body: t.Object({
        metaId: t.Integer(),
        targetGroupId: t.Integer(),
      }),
      userId: true,
    },
  )
  .delete(
    '/images/:imageId',
    async ({ params: { imageId }, userId, status }) => {
      const savedImage = await db.$primary
        .select()
        .from(metaImages)
        .innerJoin(metas, eq(metas.id, metaImages.metaId))
        .where(eq(metaImages.id, imageId));

      if (savedImage.length === 0) {
        return status(404);
      }
      await ensurePermissions(userId, savedImage[0].metas.mapGroupId);

      await db.$primary.transaction(async (tx) => {
        await tx.delete(metaImages).where(eq(metaImages.id, imageId));
        await tx
          .update(metas)
          .set({ modifiedAt: Math.floor(Date.now() / 1000) })
          .where(eq(metas.id, savedImage[0].metas.id));
        await logChange(tx, {
          mapGroupId: savedImage[0].metas.mapGroupId,
          userId,
          entityType: 'meta_image',
          entityId: savedImage[0].metas.id,
          entityLabel: savedImage[0].metas.tagName,
          operation: 'delete',
          oldValue: { imageUrl: savedImage[0].meta_images.image_url },
        });
      });

      return { imageId };
    },
    {
      params: t.Object({ imageId: t.Integer() }),
      userId: true,
    },
  );
