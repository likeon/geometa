import { describe, expect, test } from 'bun:test';
import { mapGroupChanges, mapGroups, users } from '../db/schema';
import { db } from '../drizzle';
import { logChange } from './changes';

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
  return db.select().from(mapGroupChanges);
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
});
