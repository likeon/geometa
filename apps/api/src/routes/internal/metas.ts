import {
  levels,
  mapGroupLocations,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { generateRandomString } from '@api/lib/utils/common';
import { markdown2Html } from '@api/lib/utils/markdown';
import { uploadImage } from '@api/lib/utils/s3';
import { and, eq, inArray, not } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { Elysia, t } from 'elysia';
import sharp from 'sharp';

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
  .get(
    '/:id/images',
    async ({ userId, params, status }) => {
      const meta = await db.$primary.query.metas.findFirst({
        where: eq(metas.id, params.id),
      });
      if (!meta) {
        return status(404, undefined);
      }

      await ensurePermissions(userId, meta.mapGroupId);

      const images = await db
        .select({
          image_url: metaImages.image_url,
          order: metaImages.order,
        })
        .from(metaImages)
        .where(eq(metaImages.metaId, params.id))
        .orderBy(metaImages.order, metaImages.id);

      return images;
    },
    {
      userId: true,
      params: t.Object({
        id: t.Integer(),
      }),
      response: {
        200: t.Array(
          t.Object({
            image_url: t.String(),
            order: t.Integer(),
          }),
        ),
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
  .put(
    '/',
    async ({ body, userId, status }) => {
      await ensurePermissions(userId, body.mapGroupId);

      const { id, levels: levelIds, ...dataNoId } = body;
      const noteHtml = await markdown2Html(dataNoId.note);
      const footerHtml = await markdown2Html(dataNoId.footer);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      if (id !== undefined) {
        const savedData = await db.$primary.query.metas.findFirst({
          where: eq(metas.id, id),
        });
        if (!savedData) {
          return status(404);
        }
        await ensurePermissions(userId, savedData.mapGroupId);
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
          return metaId;
        });
        return { id: metaId };
      } catch (error) {
        if (error instanceof DrizzleQueryError) {
          const pgError = error.cause as { constraint_name?: string };
          if (pgError?.constraint_name === 'metas_unique') {
            return status(409, {
              message:
                'A meta with this tag name already exists in this map group',
            });
          }
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

      await db.delete(metas).where(inArray(metas.id, body.ids));
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

      const existingMetaLevels = await db.$primary
        .select({ metaId: metaLevels.metaId, levelId: metaLevels.levelId })
        .from(metaLevels)
        .where(
          and(
            inArray(metaLevels.metaId, metaIds),
            inArray(metaLevels.levelId, levelIds),
          ),
        );
      const existingCombinations = new Set(
        existingMetaLevels.map((ml) => `${ml.metaId}-${ml.levelId}`),
      );

      const metaLevelInserts: { metaId: number; levelId: number }[] = [];
      for (const metaId of metaIds) {
        const meta = selectedMetas.find((m) => m.id === metaId);
        if (!meta) continue;

        for (const levelId of levelIds) {
          const level = selectedLevels.find((l) => l.id === levelId);
          if (!level) continue;
          if (level.mapGroupId !== meta.mapGroupId) continue;
          if (existingCombinations.has(`${metaId}-${levelId}`)) continue;

          metaLevelInserts.push({ metaId, levelId });
        }
      }

      if (metaLevelInserts.length === 0) {
        return {
          message:
            'No new levels to add (all selected levels already assigned or invalid)',
          addedCount: 0,
        };
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      await db.$primary.transaction(async (tx) => {
        await tx
          .insert(metaLevels)
          .values(metaLevelInserts)
          .onConflictDoNothing();
        await tx
          .update(metas)
          .set({ modifiedAt: currentTimestamp })
          .where(inArray(metas.id, metaIds));
        await tx
          .update(mapGroups)
          .set({ syncedAt: null })
          .where(inArray(mapGroups.id, uniqueMapGroupIds));
      });

      return {
        message: `Successfully added ${metaLevelInserts.length} level assignments to ${metaIds.length} metas`,
        addedCount: metaLevelInserts.length,
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
        const { id, mapGroupId, ...cleanedMeta } = meta;

        try {
          await db.$primary.transaction(async (tx) => {
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
              return; // Skip if meta already exists
            }

            const newMetaId = insertResult[0].insertedId;
            successfulCopies.push(id);

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

            const sourceLocations = await tx
              .select({
                lat: mapGroupLocations.lat,
                lng: mapGroupLocations.lng,
                heading: mapGroupLocations.heading,
                pitch: mapGroupLocations.pitch,
                zoom: mapGroupLocations.zoom,
                panoId: mapGroupLocations.panoId,
                extraTag: mapGroupLocations.extraTag,
                extraPanoId: mapGroupLocations.extraPanoId,
                extraPanoDate: mapGroupLocations.extraPanoDate,
              })
              .from(mapGroupLocations)
              .where(
                and(
                  eq(mapGroupLocations.mapGroupId, mapGroupId),
                  eq(mapGroupLocations.extraTag, meta.tagName),
                ),
              );
            if (sourceLocations.length > 0) {
              await tx
                .insert(mapGroupLocations)
                .values(
                  sourceLocations.map((location) => ({
                    ...location,
                    mapGroupId: targetGroupId,
                    updatedAt: currentTimestamp,
                    modifiedAt: currentTimestamp,
                  })),
                )
                .onConflictDoNothing();
            }

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
          });
        } catch (error) {
          console.error(`Failed to copy meta ${id}:`, error);
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

      const { id, mapGroupId, ...cleanedMeta } = meta;
      void id;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      await db.$primary.transaction(async (tx) => {
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
          return;
        }

        const sourceImages = await tx
          .select({ image_url: metaImages.image_url })
          .from(metaImages)
          .where(eq(metaImages.metaId, metaId));
        if (sourceImages.length !== 0) {
          await tx
            .insert(metaImages)
            .values(
              sourceImages.map((sourceImage) => ({
                image_url: sourceImage.image_url,
                metaId: insertResult[0].insertedId,
              })),
            )
            .onConflictDoNothing();
        }

        const sourceLocations = await tx
          .select({
            lat: mapGroupLocations.lat,
            lng: mapGroupLocations.lng,
            heading: mapGroupLocations.heading,
            pitch: mapGroupLocations.pitch,
            zoom: mapGroupLocations.zoom,
            panoId: mapGroupLocations.panoId,
            extraTag: mapGroupLocations.extraTag,
            extraPanoId: mapGroupLocations.extraPanoId,
            extraPanoDate: mapGroupLocations.extraPanoDate,
          })
          .from(mapGroupLocations)
          .where(
            and(
              eq(mapGroupLocations.mapGroupId, mapGroupId),
              eq(mapGroupLocations.extraTag, meta.tagName),
            ),
          );
        if (sourceLocations.length !== 0) {
          await tx
            .insert(mapGroupLocations)
            .values(
              sourceLocations.map((location) => ({
                ...location,
                mapGroupId: targetGroupId,
                updatedAt: currentTimestamp,
                modifiedAt: currentTimestamp,
              })),
            )
            .onConflictDoNothing();
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
      });

      return { imageId };
    },
    {
      params: t.Object({ imageId: t.Integer() }),
      userId: true,
    },
  );
