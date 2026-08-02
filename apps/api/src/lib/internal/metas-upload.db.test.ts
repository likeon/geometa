import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import {
  levels,
  mapGroupChanges,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users,
} from '../db/schema';
import { db } from '../drizzle';
import { uploadMetas } from './metas-upload';

async function seedCreateFixture() {
  await db.insert(users).values({ id: 'uploader', username: 'uploader' });
  const [group] = await db
    .insert(mapGroups)
    .values({ name: 'Test group' })
    .returning({ id: mapGroups.id });
  const [levelA] = await db
    .insert(levels)
    .values({ name: 'Level A', mapGroupId: group!.id })
    .returning({ id: levels.id });
  const [levelB] = await db
    .insert(levels)
    .values({ name: 'Level B', mapGroupId: group!.id })
    .returning({ id: levels.id });
  return { groupId: group!.id, levelAId: levelA!.id, levelBId: levelB!.id };
}

describe('uploadMetas create', () => {
  test('persists raw markdown, rendered html, levels, images, timestamp, and create change entry', async () => {
    const { groupId, levelAId, levelBId } = await seedCreateFixture();
    const before = Math.floor(Date.now() / 1000);

    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'United States',
          note: '**Capital:** Washington',
          footer: 'See [source](https://example.com)',
          levels: ['Level B', 'Level A'],
          images: ['https://img.example/b.jpg', 'https://img.example/a.jpg'],
        },
      ],
      true,
      false,
    );
    const after = Math.floor(Date.now() / 1000);

    const [meta] = await db
      .select()
      .from(metas)
      .where(eq(metas.mapGroupId, groupId));
    expect(meta).toBeDefined();
    expect(meta).toMatchObject({
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      noteHtml: '<p><strong>Capital:</strong> Washington</p>',
      footer: 'See [source](https://example.com)',
      footerHtml:
        '<p>See <a href="https://example.com" rel="nofollow" target="_blank">source</a></p>',
      noteFromPlonkit: false,
    });

    expect(meta.modifiedAt).toBeGreaterThanOrEqual(before);
    expect(meta.modifiedAt).toBeLessThanOrEqual(after);

    const metaLevelRows = await db
      .select()
      .from(metaLevels)
      .where(eq(metaLevels.metaId, meta.id));
    expect(metaLevelRows.map((row) => row.levelId).sort()).toEqual(
      [levelAId, levelBId].sort(),
    );

    const imageRows = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, meta.id));
    expect(imageRows.map((row) => row.image_url).sort()).toEqual([
      'https://img.example/a.jpg',
      'https://img.example/b.jpg',
    ]);

    const changes = await db
      .select()
      .from(mapGroupChanges)
      .where(eq(mapGroupChanges.mapGroupId, groupId));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      userId: 'uploader',
      entityType: 'meta',
      entityId: meta.id,
      entityLabel: 'us',
      operation: 'create',
      oldValue: null,
    });
    expect(changes[0].newValue).toEqual({
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      footer: 'See [source](https://example.com)',
      noteFromPlonkit: false,
      levels: ['Level A', 'Level B'],
      images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
    });
  });
});

describe('uploadMetas update', () => {
  test('updates an existing meta in place: raw+rendered markdown, levels/images replacement, refreshed timestamp, and exact update change entry', async () => {
    const { groupId, levelAId, levelBId } = await seedCreateFixture();

    // First upload creates the meta.
    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'United States',
          note: '**Capital:** Washington',
          footer: 'See [source](https://example.com)',
          levels: ['Level B', 'Level A'],
          images: ['https://img.example/b.jpg', 'https://img.example/a.jpg'],
        },
      ],
      true,
      false,
    );

    const [createdMeta] = await db
      .select()
      .from(metas)
      .where(eq(metas.mapGroupId, groupId));
    const createdModifiedAt = 1;
    await db
      .update(metas)
      .set({ modifiedAt: createdModifiedAt })
      .where(eq(metas.id, createdMeta!.id));

    const before = Math.floor(Date.now() / 1000);
    // Second upload with the same tagName updates the existing meta.
    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'USA',
          note: '**Capital:** Washington, D.C.',
          footer: '**Updated:** see [docs](https://docs.example.com)',
          levels: ['Level A'],
          images: ['https://img.example/d.jpg', 'https://img.example/c.jpg'],
        },
      ],
      true,
      false,
    );
    const after = Math.floor(Date.now() / 1000);

    // Same row, upserted in place.
    const [meta] = await db
      .select()
      .from(metas)
      .where(eq(metas.mapGroupId, groupId));
    expect(meta).toBeDefined();
    expect(meta.id).toBe(createdMeta!.id);
    expect(meta).toMatchObject({
      tagName: 'us',
      name: 'USA',
      note: '**Capital:** Washington, D.C.',
      noteHtml: '<p><strong>Capital:</strong> Washington, D.C.</p>',
      footer: '**Updated:** see [docs](https://docs.example.com)',
      footerHtml:
        '<p><strong>Updated:</strong> see <a href="https://docs.example.com" rel="nofollow" target="_blank">docs</a></p>',
      noteFromPlonkit: false,
    });

    // Timestamp is refreshed to the update upload time, strictly after the
    // original create timestamp.
    expect(meta.modifiedAt).toBeGreaterThan(createdModifiedAt);
    expect(meta.modifiedAt).toBeGreaterThanOrEqual(before);
    expect(meta.modifiedAt).toBeLessThanOrEqual(after);

    // Levels replaced: only Level A remains assigned.
    const metaLevelRows = await db
      .select()
      .from(metaLevels)
      .where(eq(metaLevels.metaId, meta.id));
    expect(metaLevelRows.map((row) => row.levelId).sort()).toEqual([levelAId]);

    // Images replaced: old URLs are gone, new ones persisted.
    const imageRows = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, meta.id));
    expect(imageRows.map((row) => row.image_url).sort()).toEqual([
      'https://img.example/c.jpg',
      'https://img.example/d.jpg',
    ]);

    // Exactly two entries: the create from the first upload and the
    // meaningful update from the second.
    const changes = await db
      .select()
      .from(mapGroupChanges)
      .where(eq(mapGroupChanges.mapGroupId, groupId));
    expect(changes).toHaveLength(2);
    const update = changes.find((row) => row.operation === 'update')!;
    expect(update).toMatchObject({
      userId: 'uploader',
      entityType: 'meta',
      entityId: meta.id,
      entityLabel: 'us',
      operation: 'update',
    });
    expect(update.createdAt).toBeGreaterThanOrEqual(before);
    expect(update.createdAt).toBeLessThanOrEqual(after);
    expect(update.oldValue).toEqual({
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      footer: 'See [source](https://example.com)',
      noteFromPlonkit: false,
      levels: ['Level A', 'Level B'],
      images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
    });
    expect(update.newValue).toEqual({
      tagName: 'us',
      name: 'USA',
      note: '**Capital:** Washington, D.C.',
      footer: '**Updated:** see [docs](https://docs.example.com)',
      noteFromPlonkit: false,
      levels: ['Level A'],
      images: ['https://img.example/c.jpg', 'https://img.example/d.jpg'],
    });

    // Level B itself is untouched, just unassigned from the meta.
    const [levelB] = await db
      .select()
      .from(levels)
      .where(eq(levels.id, levelBId));
    expect(levelB).toMatchObject({ id: levelBId, name: 'Level B' });
  });
});

describe('uploadMetas partial vs full', () => {
  test('partial upload preserves omitted metas; full upload deletes omitted metas and cascades their level/image associations', async () => {
    const { groupId, levelBId } = await seedCreateFixture();
    const [levelC] = await db
      .insert(levels)
      .values({ name: 'Level C', mapGroupId: groupId })
      .returning({ id: levels.id });
    const levelCId = levelC!.id;

    // Initial partial upload creates two metas with level/image associations.
    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'United States',
          note: '**Capital:** Washington',
          footer: 'See [source](https://example.com)',
          levels: ['Level A', 'Level B'],
          images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        },
        {
          tagName: 'ca',
          metaName: 'Canada',
          note: '**Capital:** Ottawa',
          footer: 'See [ca](https://ca.example.com)',
          levels: ['Level B', 'Level C'],
          images: ['https://img.example/c.jpg', 'https://img.example/d.jpg'],
        },
      ],
      true,
      false,
    );

    const [caMeta] = await db
      .select()
      .from(metas)
      .where(eq(metas.tagName, 'ca'));
    expect(caMeta).toBeDefined();

    // Partial upload of only 'us' preserves the omitted 'ca' meta and its
    // level/image associations untouched.
    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'United States',
          note: '**Capital:** Washington',
          footer: 'See [source](https://example.com)',
          levels: ['Level A', 'Level B'],
          images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        },
      ],
      true,
      false,
    );

    const [caAfterPartial] = await db
      .select()
      .from(metas)
      .where(eq(metas.tagName, 'ca'));
    expect(caAfterPartial).toMatchObject({
      id: caMeta!.id,
      tagName: 'ca',
      name: 'Canada',
    });
    const caLevelsAfterPartial = await db
      .select({ levelId: metaLevels.levelId })
      .from(metaLevels)
      .where(eq(metaLevels.metaId, caMeta!.id));
    expect(caLevelsAfterPartial.map((row) => row.levelId).sort()).toEqual(
      [levelBId, levelCId].sort(),
    );
    const caImagesAfterPartial = await db
      .select({ image_url: metaImages.image_url })
      .from(metaImages)
      .where(eq(metaImages.metaId, caMeta!.id));
    expect(caImagesAfterPartial.map((row) => row.image_url).sort()).toEqual([
      'https://img.example/c.jpg',
      'https://img.example/d.jpg',
    ]);

    // Full upload of only 'us' deletes the omitted 'ca' meta; its
    // metaLevels/metaImages rows cascade away while Level C itself survives.
    await uploadMetas(
      groupId,
      'uploader',
      [
        {
          tagName: 'us',
          metaName: 'United States',
          note: '**Capital:** Washington',
          footer: 'See [source](https://example.com)',
          levels: ['Level A', 'Level B'],
          images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        },
      ],
      false,
      false,
    );

    const metasAfterFull = await db
      .select()
      .from(metas)
      .where(eq(metas.mapGroupId, groupId));
    expect(metasAfterFull.map((meta) => meta.tagName)).toEqual(['us']);
    const caAfterFull = await db
      .select()
      .from(metas)
      .where(eq(metas.tagName, 'ca'));
    expect(caAfterFull).toHaveLength(0);
    const caLevelsAfterFull = await db
      .select()
      .from(metaLevels)
      .where(eq(metaLevels.metaId, caMeta!.id));
    expect(caLevelsAfterFull).toHaveLength(0);
    const caImagesAfterFull = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, caMeta!.id));
    expect(caImagesAfterFull).toHaveLength(0);
    const [levelCAfterFull] = await db
      .select()
      .from(levels)
      .where(eq(levels.id, levelCId));
    expect(levelCAfterFull).toMatchObject({ id: levelCId, name: 'Level C' });
  });
});
