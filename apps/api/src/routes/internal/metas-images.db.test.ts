import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { app } from '@api/api';
import {
  mapGroupChanges,
  mapGroupPermissions,
  mapGroups,
  metaImages,
  metas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, asc, eq } from 'drizzle-orm';

// distinctive value that a successful reorder overwrites
const SEED_MODIFIED_AT = 1_000_000;

// S3 is the only true external boundary of the upload flow. Stub it before the
// app module graph loads so the real Elysia handler, sharp conversion, and
// PostgreSQL transaction run end to end.
let uploadImageMock: (file: ArrayBuffer, name: string) => Promise<string>;
mock.module('@api/lib/utils/s3', () => ({
  uploadImage: (file: ArrayBuffer, name: string) => uploadImageMock(file, name),
}));

beforeEach(() => {
  uploadImageMock = async () => {
    throw new Error('uploadImage should not be called');
  };
});

// 1x1 png: valid input for sharp, compact enough to keep inline
const PNG_FIXTURE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function seedUser(id: string) {
  await db.insert(users).values({ id, username: id });
}

async function seedGroup(name: string) {
  const [group] = await db
    .insert(mapGroups)
    .values({ name })
    .returning({ id: mapGroups.id });
  return group!.id;
}

async function seedPermission(userId: string, groupId: number) {
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role: 'owner',
  });
}

async function seedMeta(groupId: number, tagName: string) {
  const [meta] = await db
    .insert(metas)
    .values({
      mapGroupId: groupId,
      tagName,
      name: tagName,
      note: `note for ${tagName}`,
      modifiedAt: SEED_MODIFIED_AT,
    })
    .returning({ id: metas.id });
  return meta!.id;
}

async function seedImage(metaId: number, imageUrl: string, order = 0) {
  const [image] = await db
    .insert(metaImages)
    .values({ metaId, image_url: imageUrl, order })
    .returning({ id: metaImages.id });
  return image!;
}

function reorderImagesRequest(userId: string, metaId: number, body: unknown) {
  return app.handle(
    new Request(`http://localhost/api/internal/metas/${metaId}/images/order`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

function uploadImageRequest(userId: string, metaId: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return app.handle(
    new Request(`http://localhost/api/internal/metas/${metaId}/images`, {
      method: 'POST',
      headers: {
        'x-api-user-id': userId,
      },
      body: form,
    }),
  );
}

function deleteImageRequest(userId: string, imageId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/metas/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'x-api-user-id': userId,
      },
    }),
  );
}

async function getImageOrders(metaId: number) {
  return db
    .select({ id: metaImages.id, order: metaImages.order })
    .from(metaImages)
    .where(eq(metaImages.metaId, metaId))
    .orderBy(asc(metaImages.id));
}

async function getMetaModifiedAt(metaId: number) {
  const [meta] = await db
    .select({ modifiedAt: metas.modifiedAt })
    .from(metas)
    .where(eq(metas.id, metaId));
  return meta!.modifiedAt;
}

async function getReorderLogs(groupId: number) {
  return db
    .select({
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      newValue: mapGroupChanges.newValue,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'meta_image'),
        eq(mapGroupChanges.operation, 'update'),
      ),
    );
}

async function getImageUrls(metaId: number) {
  return db
    .select({ imageUrl: metaImages.image_url })
    .from(metaImages)
    .where(eq(metaImages.metaId, metaId));
}

async function getImageCreateLogs(groupId: number) {
  return db
    .select({
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      newValue: mapGroupChanges.newValue,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'meta_image'),
        eq(mapGroupChanges.operation, 'create'),
      ),
    );
}

async function getImageDeleteLogs(groupId: number) {
  return db
    .select({
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'meta_image'),
        eq(mapGroupChanges.operation, 'delete'),
      ),
    );
}

describe('PUT /api/internal/metas/:id/images/order', () => {
  test('reorders images, bumps the meta modifiedAt, and logs the reorder', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    const first = await seedImage(
      metaId,
      'https://img.example/france-1.jpg',
      1,
    );
    const second = await seedImage(
      metaId,
      'https://img.example/france-2.jpg',
      2,
    );

    const response = await reorderImagesRequest('owner-1', metaId, {
      updates: [
        { imageId: first.id, order: 2 },
        { imageId: second.id, order: 1 },
      ],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Image order updated successfully.',
    });
    expect(await getImageOrders(metaId)).toEqual([
      { id: first.id, order: 2 },
      { id: second.id, order: 1 },
    ]);
    expect(await getMetaModifiedAt(metaId)).not.toBe(SEED_MODIFIED_AT);
    const logs = await getReorderLogs(groupId);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual(
      expect.objectContaining({
        entityId: metaId,
        entityLabel: 'france',
        operation: 'update',
        newValue: { reorderedImages: 2 },
      }),
    );
  });

  test('rejects a missing image id with 404 and rolls back every earlier update', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    const first = await seedImage(
      metaId,
      'https://img.example/france-1.jpg',
      1,
    );
    const second = await seedImage(
      metaId,
      'https://img.example/france-2.jpg',
      2,
    );
    const missingImageId = second.id + 1000;

    // the valid update comes first: only an atomic rollback keeps it from
    // persisting when the missing image id fails later in the same batch
    const response = await reorderImagesRequest('owner-1', metaId, {
      updates: [
        { imageId: first.id, order: 9 },
        { imageId: missingImageId, order: 1 },
      ],
    });

    expect(response.status).toBe(404);
    // no partial write survived: orders, meta modifiedAt, and the log are
    // all exactly as they were before the request
    expect(await getImageOrders(metaId)).toEqual([
      { id: first.id, order: 1 },
      { id: second.id, order: 2 },
    ]);
    expect(await getMetaModifiedAt(metaId)).toBe(SEED_MODIFIED_AT);
    expect(await getReorderLogs(groupId)).toEqual([]);
  });

  test('rejects an image belonging to another meta with 404 and leaves both metas untouched', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const franceId = await seedMeta(groupId, 'france');
    const germanyId = await seedMeta(groupId, 'germany');
    const franceImage = await seedImage(
      franceId,
      'https://img.example/france.jpg',
      1,
    );
    const germanyImage = await seedImage(
      germanyId,
      'https://img.example/germany.jpg',
      2,
    );

    // germany's image id is foreign to france's meta, so the scoped update
    // matches no row and the whole batch must roll back
    const response = await reorderImagesRequest('owner-1', franceId, {
      updates: [
        { imageId: franceImage.id, order: 5 },
        { imageId: germanyImage.id, order: 6 },
      ],
    });

    expect(response.status).toBe(404);
    expect(await getImageOrders(franceId)).toEqual([
      { id: franceImage.id, order: 1 },
    ]);
    expect(await getImageOrders(germanyId)).toEqual([
      { id: germanyImage.id, order: 2 },
    ]);
    expect(await getMetaModifiedAt(franceId)).toBe(SEED_MODIFIED_AT);
    expect(await getMetaModifiedAt(germanyId)).toBe(SEED_MODIFIED_AT);
    expect(await getReorderLogs(groupId)).toEqual([]);
  });

  // todo: the handler returns status(404, undefined), which Elysia turns into a
  // "Not Found" body; the declared 404: t.Void() response schema then rejects it
  // as a 422 validation error. Missing metas should surface as 404.
  test.todo('rejects a missing meta with 404', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');

    const response = await reorderImagesRequest('owner-1', metaId + 1000, {
      updates: [{ imageId: 1, order: 1 }],
    });

    expect(response.status).toBe(404);
    expect(await getReorderLogs(groupId)).toEqual([]);
  });
});

describe('DELETE /api/internal/metas/images/:imageId', () => {
  test('deletes only the target image, bumps the meta modifiedAt, and logs the delete', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    const target = await seedImage(
      metaId,
      'https://img.example/france-1.jpg',
      1,
    );
    await seedImage(metaId, 'https://img.example/france-2.jpg', 2);

    const response = await deleteImageRequest('owner-1', target.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imageId: target.id });
    // only the exact target row is gone; unrelated images of the same meta
    // survive untouched
    expect(await getImageUrls(metaId)).toEqual([
      { imageUrl: 'https://img.example/france-2.jpg' },
    ]);
    expect(await getMetaModifiedAt(metaId)).not.toBe(SEED_MODIFIED_AT);
    expect(await getImageDeleteLogs(groupId)).toEqual([
      expect.objectContaining({
        entityId: metaId,
        entityLabel: 'france',
        operation: 'delete',
        oldValue: { imageUrl: 'https://img.example/france-1.jpg' },
      }),
    ]);
  });

  test('rejects a missing image with 404 and leaves the meta untouched', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    const image = await seedImage(
      metaId,
      'https://img.example/france-1.jpg',
      1,
    );
    const missingImageId = image.id + 1000;

    const response = await deleteImageRequest('owner-1', missingImageId);

    expect(response.status).toBe(404);
    expect(await getImageUrls(metaId)).toEqual([
      { imageUrl: 'https://img.example/france-1.jpg' },
    ]);
    expect(await getMetaModifiedAt(metaId)).toBe(SEED_MODIFIED_AT);
    expect(await getImageDeleteLogs(groupId)).toEqual([]);
  });
});

describe('POST /api/internal/metas/:id/images', () => {
  test('converts a valid image, stores the uploaded URL, and logs the create', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    const uploadedUrl = 'https://learnablemeta.com/images/123456789-abc.avif';
    const calls: { file: ArrayBuffer; name: string }[] = [];
    uploadImageMock = async (file, name) => {
      calls.push({ file, name });
      return uploadedUrl;
    };

    const response = await uploadImageRequest(
      'owner-1',
      metaId,
      new File([PNG_FIXTURE], 'photo.png', { type: 'image/png' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imageUrl: uploadedUrl });
    expect(calls).toHaveLength(1);
    // the file was converted before upload: avif container magic bytes
    expect(Buffer.from(calls[0].file).subarray(4, 12).toString()).toBe(
      'ftypavif',
    );
    expect(calls[0].name).toMatch(
      new RegExp(`^${groupId}/\\d+-\\w{3}\\.avif$`),
    );
    expect(await getImageUrls(metaId)).toEqual([{ imageUrl: uploadedUrl }]);
    expect(await getMetaModifiedAt(metaId)).not.toBe(SEED_MODIFIED_AT);
    expect(await getImageCreateLogs(groupId)).toEqual([
      expect.objectContaining({
        entityId: metaId,
        entityLabel: 'france',
        operation: 'create',
        newValue: { imageUrl: uploadedUrl },
      }),
    ]);
  });

  // todo: the handler returns status(400, undefined), which Elysia turns into a
  // "Bad Request" body; the declared 400: t.Void() response schema then rejects
  // it as a 422 validation error. Non-image uploads should surface as 400, and
  // the meta must stay untouched either way.
  test.todo('rejects a non-image upload with 400 and leaves the meta untouched', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');

    const response = await uploadImageRequest(
      'owner-1',
      metaId,
      new File(['not actually an image'], 'broken.png', { type: 'image/png' }),
    );

    expect(response.status).toBe(400);
    expect(await getImageUrls(metaId)).toEqual([]);
    expect(await getMetaModifiedAt(metaId)).toBe(SEED_MODIFIED_AT);
    expect(await getImageCreateLogs(groupId)).toEqual([]);
  });

  test('leaves the meta untouched when the S3 upload fails', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const metaId = await seedMeta(groupId, 'france');
    uploadImageMock = async () => {
      throw new Error('s3 upload failed');
    };

    const response = await uploadImageRequest(
      'owner-1',
      metaId,
      new File([PNG_FIXTURE], 'photo.png', { type: 'image/png' }),
    );

    expect(response.status).toBe(500);
    expect(await getImageUrls(metaId)).toEqual([]);
    expect(await getMetaModifiedAt(metaId)).toBe(SEED_MODIFIED_AT);
    expect(await getImageCreateLogs(groupId)).toEqual([]);
  });
});
