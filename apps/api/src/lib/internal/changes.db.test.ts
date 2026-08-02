import { describe, expect, test } from 'bun:test';
import { asc } from 'drizzle-orm';
import { mapGroupChanges, mapGroups, users } from '../db/schema';
import { db } from '../drizzle';
import { type ChangeEntry, logChange, metaSnapshot } from './changes';

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

async function changeRows() {
  return db.select().from(mapGroupChanges).orderBy(asc(mapGroupChanges.id));
}

describe('logChange', () => {
  test('retains create and delete entries', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');

    await logChange(db, [
      {
        mapGroupId: groupId,
        userId: 'u',
        entityType: 'meta',
        entityId: 7,
        operation: 'create',
        newValue: { name: 'Meta' },
      },
      {
        mapGroupId: groupId,
        userId: 'u',
        entityType: 'meta',
        entityId: 7,
        operation: 'delete',
        oldValue: { name: 'Meta' },
      },
    ]);

    const rows = await changeRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.operation).sort()).toEqual([
      'create',
      'delete',
    ]);
  });

  test('skips structurally identical update', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');
    const before = { name: 'Meta', footer: 'x' };
    const after = { name: 'Meta', footer: 'x' };

    await logChange(db, {
      mapGroupId: groupId,
      userId: 'u',
      entityType: 'meta',
      entityId: 7,
      operation: 'update',
      oldValue: before,
      newValue: after,
    });

    expect(await changeRows()).toHaveLength(0);
  });

  test('mixed list filters no-op updates but inserts meaningful entries', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');

    await logChange(db, [
      {
        mapGroupId: groupId,
        userId: 'u',
        entityType: 'meta',
        entityId: 7,
        operation: 'update',
        oldValue: { name: 'Meta' },
        newValue: { name: 'Meta' },
      },
      {
        mapGroupId: groupId,
        userId: 'u',
        entityType: 'meta',
        entityId: 7,
        operation: 'update',
        oldValue: { name: 'Meta' },
        newValue: { name: 'Renamed' },
      },
      {
        mapGroupId: groupId,
        userId: 'u',
        entityType: 'meta_image',
        entityId: 9,
        operation: 'create',
        newValue: { url: '/img.png' },
      },
    ]);

    const rows = await changeRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.operation).sort()).toEqual([
      'create',
      'update',
    ]);
    const update = rows.find((row) => row.operation === 'update')!;
    expect(update.oldValue).toEqual({ name: 'Meta' });
    expect(update.newValue).toEqual({ name: 'Renamed' });
  });

  test('retains value-less update (sync marker)', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');

    await logChange(db, {
      mapGroupId: groupId,
      userId: 'u',
      entityType: 'sync',
      operation: 'update',
    });

    const rows = await changeRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].operation).toBe('update');
    expect(rows[0].entityType).toBe('sync');
    expect(rows[0].oldValue).toBeNull();
    expect(rows[0].newValue).toBeNull();
  });

  test('explicit false/zero/empty values survive serialization', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');
    const newValue = { enabled: false, count: 0, items: [] };

    await logChange(db, {
      mapGroupId: groupId,
      userId: 'u',
      entityType: 'settings',
      operation: 'create',
      newValue,
    });

    const rows = await changeRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].newValue).toEqual({ enabled: false, count: 0, items: [] });
  });

  test('persists every entry when one call spans more than 1000 rows', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');
    const count = 1001;

    const entries: ChangeEntry[] = Array.from({ length: count }, (_, i) => ({
      mapGroupId: groupId,
      userId: 'u',
      entityType: 'meta',
      entityId: i + 1,
      operation: 'create',
      newValue: { n: i + 1 },
    }));

    await logChange(db, entries);

    const rows = await changeRows();
    expect(rows).toHaveLength(count);
    expect(rows.map((row) => row.entityId)).toEqual(
      Array.from({ length: count }, (_, i) => i + 1),
    );
    expect(rows.map((row) => row.newValue)).toEqual(
      Array.from({ length: count }, (_, i) => ({ n: i + 1 })),
    );
  });

  test('late failure inside a transaction rolls back all logChange batches', async () => {
    await seedUser('u');
    const groupId = await seedGroup('Group');

    // First batch of 1000 succeeds; the trailing entry carries a user id that
    // violates the map_group_changes.user_id foreign key, failing the second
    // batch.
    const entries: ChangeEntry[] = Array.from({ length: 1001 }, (_, i) => ({
      mapGroupId: groupId,
      userId: i < 1000 ? 'u' : 'missing-user',
      entityType: 'meta',
      entityId: i + 1,
      operation: 'create',
      newValue: { n: i + 1 },
    }));

    await expect(
      db.transaction(async (tx) => {
        await logChange(tx, entries);
      }),
    ).rejects.toThrow();

    expect(await changeRows()).toHaveLength(0);
  });
});

describe('metaSnapshot', () => {
  test('includes exact public audit fields and preserves false/null', () => {
    const snapshot = metaSnapshot({
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      footer: null,
      noteFromPlonkit: false,
    });

    expect(snapshot).toEqual({
      tagName: 'us',
      name: 'United States',
      note: '**Capital:** Washington',
      footer: null,
      noteFromPlonkit: false,
    });
  });
});
