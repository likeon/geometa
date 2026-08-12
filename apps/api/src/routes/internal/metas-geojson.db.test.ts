import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  mapGroupChanges,
  mapGroupPermissions,
  mapGroups,
  metas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { MAX_GEOJSON_BYTES, normalizeGeoJson } from '@api/lib/utils/geojson';
import { and, eq } from 'drizzle-orm';

const SEED_MODIFIED_AT = 1_000_000;
const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [10, 20],
      [11, 20],
      [11, 21],
      [10, 20],
    ],
  ],
};

async function seedMeta(
  geoJson: ReturnType<typeof normalizeGeoJson> | null = null,
) {
  await db.insert(users).values({ id: 'owner', username: 'owner' });
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'GeoJSON group' })
    .returning({ id: mapGroups.id });
  await db.insert(mapGroupPermissions).values({
    mapGroupId: group!.id,
    userId: 'owner',
    role: 'owner',
  });
  const [meta] = await db
    .insert(metas)
    .values({
      mapGroupId: group!.id,
      tagName: 'area',
      name: 'Area',
      note: '',
      geoJson,
      modifiedAt: SEED_MODIFIED_AT,
    })
    .returning({ id: metas.id });
  return { groupId: group!.id, metaId: meta!.id };
}

function uploadRequest(metaId: number, contents: string) {
  const body = new FormData();
  body.append(
    'file',
    new File([contents], 'area.geojson', { type: 'application/geo+json' }),
  );
  return app.handle(
    new Request(`http://localhost/api/internal/metas/${metaId}/geojson`, {
      method: 'PUT',
      headers: { 'x-api-user-id': 'owner' },
      body,
    }),
  );
}

function deleteRequest(metaId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/metas/${metaId}/geojson`, {
      method: 'DELETE',
      headers: { 'x-api-user-id': 'owner' },
    }),
  );
}

function previewRequest(metaId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/metas/${metaId}/geojson`, {
      headers: { 'x-api-user-id': 'owner' },
    }),
  );
}

async function savedMeta(metaId: number) {
  const [meta] = await db
    .select({ geoJson: metas.geoJson, modifiedAt: metas.modifiedAt })
    .from(metas)
    .where(eq(metas.id, metaId));
  return meta!;
}

async function areaLogs(groupId: number) {
  return db
    .select({
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
    })
    .from(mapGroupChanges)
    .where(
      and(
        eq(mapGroupChanges.mapGroupId, groupId),
        eq(mapGroupChanges.entityType, 'meta_geojson'),
      ),
    );
}

describe('meta GeoJSON routes', () => {
  test('returns an existing map area for preview', async () => {
    const geoJson = normalizeGeoJson(polygon);
    const { metaId } = await seedMeta(geoJson);

    const response = await previewRequest(metaId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(geoJson);
  });

  test('uploads, normalizes, marks modified, and logs a map area', async () => {
    const { groupId, metaId } = await seedMeta();

    const response = await uploadRequest(metaId, JSON.stringify(polygon));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ featureCount: 1, polygonCount: 1 });
    const saved = await savedMeta(metaId);
    expect(saved.geoJson).toEqual(normalizeGeoJson(polygon));
    expect(saved.modifiedAt).not.toBe(SEED_MODIFIED_AT);
    expect(await areaLogs(groupId)).toEqual([
      {
        operation: 'create',
        oldValue: null,
        newValue: { featureCount: 1, polygonCount: 1 },
      },
    ]);
  });

  test('rejects unsupported and oversized files without changing the meta', async () => {
    const { groupId, metaId } = await seedMeta();

    const invalid = await uploadRequest(
      metaId,
      JSON.stringify({ type: 'LineString', coordinates: [] }),
    );
    const oversized = await uploadRequest(
      metaId,
      ' '.repeat(MAX_GEOJSON_BYTES + 1),
    );

    expect(invalid.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(await savedMeta(metaId)).toEqual({
      geoJson: null,
      modifiedAt: SEED_MODIFIED_AT,
    });
    expect(await areaLogs(groupId)).toEqual([]);
  });

  test('deletes and logs an existing map area', async () => {
    const geoJson = normalizeGeoJson(polygon);
    const { groupId, metaId } = await seedMeta(geoJson);

    const response = await deleteRequest(metaId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect((await savedMeta(metaId)).geoJson).toBeNull();
    expect(await areaLogs(groupId)).toEqual([
      {
        operation: 'delete',
        oldValue: { featureCount: 1, polygonCount: 1 },
        newValue: null,
      },
    ]);
  });
});
