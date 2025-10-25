import { metaImages, metas } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { generateRandomString } from '@api/lib/utils/common';
import { uploadImage } from '@api/lib/utils/s3';
import { and, eq } from 'drizzle-orm';
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
  );
