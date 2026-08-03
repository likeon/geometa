import { describe, expect, test } from 'bun:test';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { app } from '../../api';
import {
  levels,
  mapGroupChanges,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  users,
} from '../../lib/db/schema';
import { db } from '../../lib/drizzle';

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

async function seedPermission(
  userId: string,
  groupId: number,
  role: 'owner' | 'editor' = 'owner',
) {
  await db.insert(mapGroupPermissions).values({
    mapGroupId: groupId,
    userId,
    role,
  });
}

async function seedLevel(groupId: number, name: string) {
  const [level] = await db
    .insert(levels)
    .values({ mapGroupId: groupId, name })
    .returning({ id: levels.id });
  return level!.id;
}

function metaBody(overrides: Record<string, unknown> = {}) {
  return {
    mapGroupId: 1,
    tagName: 'test-tag',
    name: 'Test Meta',
    note: 'plain note',
    noteFromPlonkit: false,
    levels: [],
    footer: '',
    ...overrides,
  };
}

function metaPutRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/metas/', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

function metaDeleteRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/metas/', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

function bulkLevelAssignRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/metas/levels', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

function metaCopyRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/metas/copy', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-user-id': userId,
      },
      body: JSON.stringify(body),
    }),
  );
}

// Creates a meta via the PUT endpoint and returns its id.
async function seedMeta(
  userId: string,
  groupId: number,
  tagName: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await metaPutRequest(
    userId,
    metaBody({ mapGroupId: groupId, tagName, name: tagName, ...overrides }),
  );
  expect(response.status).toBe(200);
  const { id } = (await response.json()) as { id: number };
  return id;
}

async function getDeleteLogs(groupId: number) {
  const logs = await getMetaLogs(groupId);
  return logs.filter((log) => log.operation === 'delete');
}

async function getMetaLevelIds(metaId: number) {
  return db
    .select({ levelId: metaLevels.levelId })
    .from(metaLevels)
    .where(eq(metaLevels.metaId, metaId))
    .orderBy(asc(metaLevels.levelId));
}

async function getMetaLogs(groupId: number) {
  return db
    .select({
      mapGroupId: mapGroupChanges.mapGroupId,
      userId: mapGroupChanges.userId,
      entityType: mapGroupChanges.entityType,
      entityId: mapGroupChanges.entityId,
      entityLabel: mapGroupChanges.entityLabel,
      operation: mapGroupChanges.operation,
      oldValue: mapGroupChanges.oldValue,
      newValue: mapGroupChanges.newValue,
      createdAt: mapGroupChanges.createdAt,
    })
    .from(mapGroupChanges)
    .where(eq(mapGroupChanges.mapGroupId, groupId))
    .orderBy(mapGroupChanges.id);
}

describe('PUT /api/internal/metas/', () => {
  test('create requires permission in the target group', async () => {
    await seedUser('owner-1');
    await seedUser('outsider-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);

    const response = await metaPutRequest(
      'outsider-1',
      metaBody({ mapGroupId: groupId }),
    );

    expect(response.status).toBe(403);
    expect(await db.select().from(metas)).toEqual([]);
    expect(await getMetaLogs(groupId)).toEqual([]);
  });

  test('create persists exact raw Markdown, sanitized HTML, levels, and a create log', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');
    const advanced = await seedLevel(groupId, 'Advanced');
    const note =
      '# Header\n\n<script>alert(1)</script>\n\n**bold** [link](https://example.com)';
    const footer = '## Sub\n\n<img src=x onerror=alert(1)>';

    const response = await metaPutRequest(
      'owner-1',
      metaBody({
        mapGroupId: groupId,
        tagName: 'france',
        name: 'France',
        note,
        footer,
        noteFromPlonkit: true,
        levels: [beginner, advanced],
      }),
    );

    expect(response.status).toBe(200);
    const { id } = (await response.json()) as { id: number };

    const [row] = await db.select().from(metas).where(eq(metas.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        id,
        mapGroupId: groupId,
        tagName: 'france',
        name: 'France',
        // raw Markdown persisted verbatim
        note,
        noteHtml:
          '<h1>Header</h1>\n<p><strong>bold</strong> <a href="https://example.com" rel="nofollow" target="_blank">link</a></p>',
        footer,
        // script and img tags stripped by rehype-sanitize
        footerHtml: '<h2>Sub</h2>',
        noteFromPlonkit: true,
        hasImage: false,
        modifiedAt: expect.any(Number),
      }),
    );

    expect(await getMetaLevelIds(id)).toEqual([
      { levelId: beginner },
      { levelId: advanced },
    ]);

    expect(await getMetaLogs(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'meta',
        entityId: id,
        entityLabel: 'france',
        operation: 'create',
        oldValue: null,
        newValue: {
          tagName: 'france',
          name: 'France',
          note,
          footer,
          noteFromPlonkit: true,
          levels: ['Advanced', 'Beginner'],
        },
        createdAt: expect.any(Number),
      },
    ]);
  });

  test('update replaces fields and level assignments exactly and writes an update log', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');
    const advanced = await seedLevel(groupId, 'Advanced');
    const expert = await seedLevel(groupId, 'Expert');

    const created = await metaPutRequest(
      'owner-1',
      metaBody({
        mapGroupId: groupId,
        tagName: 'france',
        name: 'France',
        note: '**old note**',
        footer: 'old footer',
        levels: [beginner, advanced],
      }),
    );
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const updated = await metaPutRequest(
      'owner-1',
      metaBody({
        id,
        mapGroupId: groupId,
        tagName: 'france',
        name: 'France Deux',
        note: '<script>alert(2)</script>\n\n*new note*',
        footer: 'new footer',
        noteFromPlonkit: false,
        levels: [advanced, expert],
      }),
    );
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ id });

    const [row] = await db.select().from(metas).where(eq(metas.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        id,
        mapGroupId: groupId,
        name: 'France Deux',
        note: '<script>alert(2)</script>\n\n*new note*',
        noteHtml: '<p><em>new note</em></p>',
        footer: 'new footer',
        footerHtml: '<p>new footer</p>',
        noteFromPlonkit: false,
      }),
    );

    // exact replacement: beginner removed, expert added, advanced kept once
    expect(await getMetaLevelIds(id)).toEqual([
      { levelId: advanced },
      { levelId: expert },
    ]);

    expect(await getMetaLogs(groupId)).toEqual([
      {
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'meta',
        entityId: id,
        entityLabel: 'france',
        operation: 'create',
        oldValue: null,
        newValue: {
          tagName: 'france',
          name: 'France',
          note: '**old note**',
          footer: 'old footer',
          noteFromPlonkit: false,
          levels: ['Advanced', 'Beginner'],
        },
        createdAt: expect.any(Number),
      },
      {
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'meta',
        entityId: id,
        entityLabel: 'france',
        operation: 'update',
        oldValue: {
          tagName: 'france',
          name: 'France',
          note: '**old note**',
          footer: 'old footer',
          noteFromPlonkit: false,
          levels: ['Advanced', 'Beginner'],
        },
        newValue: {
          tagName: 'france',
          name: 'France Deux',
          note: '<script>alert(2)</script>\n\n*new note*',
          footer: 'new footer',
          noteFromPlonkit: false,
          levels: ['Advanced', 'Expert'],
        },
        createdAt: expect.any(Number),
      },
    ]);
  });

  test('update rolls back atomically when a level insert fails', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');

    const created = await metaPutRequest(
      'owner-1',
      metaBody({
        mapGroupId: groupId,
        tagName: 'france',
        name: 'France',
        note: 'old note',
        levels: [beginner],
      }),
    );
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const failed = await metaPutRequest(
      'owner-1',
      metaBody({
        id,
        mapGroupId: groupId,
        tagName: 'france',
        name: 'Should Not Persist',
        note: 'should not persist',
        levels: [999999],
      }),
    );
    // FK violation is not a unique-tag conflict: it surfaces as 500
    expect(failed.status).toBe(500);

    const [row] = await db.select().from(metas).where(eq(metas.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        id,
        name: 'France',
        note: 'old note',
      }),
    );
    expect(await getMetaLevelIds(id)).toEqual([{ levelId: beginner }]);
    // the aborted update wrote no log
    expect(await getMetaLogs(groupId)).toHaveLength(1);
  });

  describe('move between groups', () => {
    test('requires permission in both source and target groups', async () => {
      await seedUser('source-only-1');
      await seedUser('target-only-1');
      await seedUser('both-1');
      const sourceGroup = await seedGroup('Source group');
      const targetGroup = await seedGroup('Target group');
      await seedPermission('source-only-1', sourceGroup);
      await seedPermission('target-only-1', targetGroup);
      await seedPermission('both-1', sourceGroup);
      await seedPermission('both-1', targetGroup);
      const sourceLevel = await seedLevel(sourceGroup, 'Source level');

      const created = await metaPutRequest(
        'both-1',
        metaBody({
          mapGroupId: sourceGroup,
          tagName: 'france',
          name: 'France',
          levels: [sourceLevel],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      const moveBody = metaBody({
        id,
        mapGroupId: targetGroup,
        tagName: 'france',
        name: 'France',
        levels: [],
      });

      // only source permission: rejected before any write
      const sourceOnly = await metaPutRequest('source-only-1', moveBody);
      expect(sourceOnly.status).toBe(403);
      // only target permission: rejected on the source-group check
      const targetOnly = await metaPutRequest('target-only-1', moveBody);
      expect(targetOnly.status).toBe(403);

      // meta untouched, no departure/arrival logs anywhere
      const [row] = await db.select().from(metas).where(eq(metas.id, id));
      expect(row!.mapGroupId).toBe(sourceGroup);
      expect(await getMetaLevelIds(id)).toEqual([{ levelId: sourceLevel }]);
      expect(await getMetaLogs(sourceGroup)).toHaveLength(1);
      expect(await getMetaLogs(targetGroup)).toEqual([]);
    });

    test('moves the meta, replaces levels with target levels, and logs departure and arrival', async () => {
      await seedUser('owner-1');
      const sourceGroup = await seedGroup('Source group');
      const targetGroup = await seedGroup('Target group');
      await seedPermission('owner-1', sourceGroup);
      await seedPermission('owner-1', targetGroup);
      const beginner = await seedLevel(sourceGroup, 'Beginner');
      const advanced = await seedLevel(sourceGroup, 'Advanced');
      const novice = await seedLevel(targetGroup, 'Novice');
      const expert = await seedLevel(targetGroup, 'Expert');

      const created = await metaPutRequest(
        'owner-1',
        metaBody({
          mapGroupId: sourceGroup,
          tagName: 'france',
          name: 'France',
          note: '**old note**',
          footer: 'old footer',
          levels: [beginner, advanced],
        }),
      );
      expect(created.status).toBe(200);
      const { id } = (await created.json()) as { id: number };

      const moved = await metaPutRequest(
        'owner-1',
        metaBody({
          id,
          mapGroupId: targetGroup,
          tagName: 'france',
          name: 'France',
          note: '**old note**',
          footer: 'old footer',
          levels: [novice, expert],
        }),
      );
      expect(moved.status).toBe(200);
      expect(await moved.json()).toEqual({ id });

      const [row] = await db.select().from(metas).where(eq(metas.id, id));
      expect(row!.mapGroupId).toBe(targetGroup);
      expect(await getMetaLevelIds(id)).toEqual([
        { levelId: novice },
        { levelId: expert },
      ]);

      // the original create log plus the departure logged against the source
      // group; the arrival is logged against the target group
      expect(await getMetaLogs(sourceGroup)).toEqual([
        {
          mapGroupId: sourceGroup,
          userId: 'owner-1',
          entityType: 'meta',
          entityId: id,
          entityLabel: 'france',
          operation: 'create',
          oldValue: null,
          newValue: {
            tagName: 'france',
            name: 'France',
            note: '**old note**',
            footer: 'old footer',
            noteFromPlonkit: false,
            levels: ['Advanced', 'Beginner'],
          },
          createdAt: expect.any(Number),
        },
        {
          mapGroupId: sourceGroup,
          userId: 'owner-1',
          entityType: 'meta',
          entityId: id,
          entityLabel: 'france',
          operation: 'delete',
          oldValue: {
            tagName: 'france',
            name: 'France',
            note: '**old note**',
            footer: 'old footer',
            noteFromPlonkit: false,
            levels: ['Advanced', 'Beginner'],
          },
          newValue: { movedToGroupId: targetGroup },
          createdAt: expect.any(Number),
        },
      ]);
      expect(await getMetaLogs(targetGroup)).toEqual([
        {
          mapGroupId: targetGroup,
          userId: 'owner-1',
          entityType: 'meta',
          entityId: id,
          entityLabel: 'france',
          operation: 'create',
          oldValue: null,
          newValue: {
            tagName: 'france',
            name: 'France',
            note: '**old note**',
            footer: 'old footer',
            noteFromPlonkit: false,
            levels: ['Expert', 'Novice'],
            movedFromGroupId: sourceGroup,
          },
          createdAt: expect.any(Number),
        },
      ]);
    });
  });
});

describe('DELETE /api/internal/metas/', () => {
  test('rejects a mix of existing and missing ids with 404 and deletes nothing', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const franceId = await seedMeta('owner-1', groupId, 'france');

    const response = await metaDeleteRequest('owner-1', {
      ids: [franceId, franceId + 1000],
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Some metas not found');
    expect(
      await db.select().from(metas).where(eq(metas.id, franceId)),
    ).toHaveLength(1);
    // only the create log remains; no delete log was written
    expect(await getDeleteLogs(groupId)).toEqual([]);
  });

  test('rejects duplicate ids with 404 and deletes nothing', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const franceId = await seedMeta('owner-1', groupId, 'france');
    const germanyId = await seedMeta('owner-1', groupId, 'germany');

    // the duplicate inflates ids.length past the distinct metas found, so
    // the request fails the not-found check before any write
    const response = await metaDeleteRequest('owner-1', {
      ids: [franceId, franceId],
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Some metas not found');
    expect(
      await db.select().from(metas).where(eq(metas.id, franceId)),
    ).toHaveLength(1);
    expect(
      await db.select().from(metas).where(eq(metas.id, germanyId)),
    ).toHaveLength(1);
    expect(await getDeleteLogs(groupId)).toEqual([]);
  });

  test('rejects ids from multiple map groups with 400 and deletes nothing', async () => {
    await seedUser('owner-1');
    const groupA = await seedGroup('Group A');
    const groupB = await seedGroup('Group B');
    await seedPermission('owner-1', groupA);
    await seedPermission('owner-1', groupB);
    const groupAMetaId = await seedMeta('owner-1', groupA, 'france');
    const groupBMetaId = await seedMeta('owner-1', groupB, 'germany');

    const response = await metaDeleteRequest('owner-1', {
      ids: [groupAMetaId, groupBMetaId],
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(
      'All metas must belong to the same map group',
    );
    expect(
      await db.select().from(metas).where(eq(metas.id, groupAMetaId)),
    ).toHaveLength(1);
    expect(
      await db.select().from(metas).where(eq(metas.id, groupBMetaId)),
    ).toHaveLength(1);
    expect(await getDeleteLogs(groupA)).toEqual([]);
    expect(await getDeleteLogs(groupB)).toEqual([]);
  });

  test('deletes metas, cascades associations, logs each meta, and leaves unrelated groups untouched', async () => {
    await seedUser('owner-1');
    const groupA = await seedGroup('Group A');
    const groupB = await seedGroup('Group B');
    await seedPermission('owner-1', groupA);
    await seedPermission('owner-1', groupB);
    const beginner = await seedLevel(groupA, 'Beginner');
    const advanced = await seedLevel(groupA, 'Advanced');
    const otherLevel = await seedLevel(groupB, 'Other level');

    const franceId = await seedMeta('owner-1', groupA, 'france', {
      note: '**bold** france',
      levels: [beginner, advanced],
    });
    const germanyId = await seedMeta('owner-1', groupA, 'germany', {
      note: 'germany note',
      levels: [beginner],
    });
    // image associations are seeded directly: the POST image endpoint uploads
    // to S3, which the test harness must not hit
    await db.insert(metaImages).values([
      { metaId: franceId, image_url: 'https://img.example/france.jpg' },
      { metaId: germanyId, image_url: 'https://img.example/germany.jpg' },
    ]);

    // unrelated meta in another group, owned by the same user
    const otherId = await seedMeta('owner-1', groupB, 'other', {
      note: 'other note',
      levels: [otherLevel],
    });
    await db.insert(metaImages).values({
      metaId: otherId,
      image_url: 'https://img.example/other.jpg',
    });

    const response = await metaDeleteRequest('owner-1', {
      ids: [franceId, germanyId],
    });

    expect(response.status).toBe(200);

    // both metas deleted
    expect(
      await db.select().from(metas).where(eq(metas.id, franceId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(metas).where(eq(metas.id, germanyId)),
    ).toHaveLength(0);

    // level and image associations cascade away with the metas
    expect(
      await db.select().from(metaLevels).where(eq(metaLevels.metaId, franceId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(metaImages).where(eq(metaImages.metaId, franceId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(metaLevels)
        .where(eq(metaLevels.metaId, germanyId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(metaImages)
        .where(eq(metaImages.metaId, germanyId)),
    ).toHaveLength(0);

    // levels themselves survive the cascade
    expect(
      await db.select().from(levels).where(eq(levels.id, beginner)),
    ).toHaveLength(1);
    expect(
      await db.select().from(levels).where(eq(levels.id, advanced)),
    ).toHaveLength(1);

    // one delete log per meta, snapshotting its values
    const deleteLogs = await getDeleteLogs(groupA);
    expect(deleteLogs).toHaveLength(2);
    expect(deleteLogs.map((log) => log.entityId).sort()).toEqual(
      [franceId, germanyId].sort(),
    );
    expect(deleteLogs.map((log) => log.entityLabel).sort()).toEqual([
      'france',
      'germany',
    ]);
    expect(deleteLogs.every((log) => log.userId === 'owner-1')).toBe(true);
    const franceDeleteLog = deleteLogs.find(
      (log) => log.entityId === franceId,
    )!;
    expect(franceDeleteLog.oldValue).toEqual({
      tagName: 'france',
      name: 'france',
      note: '**bold** france',
      footer: '',
      noteFromPlonkit: false,
    });

    // unrelated meta in the other group survives with its associations
    expect(
      await db.select().from(metas).where(eq(metas.id, otherId)),
    ).toHaveLength(1);
    expect(await getMetaLevelIds(otherId)).toEqual([{ levelId: otherLevel }]);
    expect(
      await db.select().from(metaImages).where(eq(metaImages.metaId, otherId)),
    ).toHaveLength(1);
    expect(await getDeleteLogs(groupB)).toEqual([]);
  });
});

describe('POST /api/internal/metas/levels', () => {
  test('assigns same-group levels to every meta, resets sync, and logs the assignment', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');
    const advanced = await seedLevel(groupId, 'Advanced');
    const franceId = await seedMeta('owner-1', groupId, 'france');
    const germanyId = await seedMeta('owner-1', groupId, 'germany');
    await db
      .update(mapGroups)
      .set({ syncedAt: 1_000_000 })
      .where(eq(mapGroups.id, groupId));

    const response = await bulkLevelAssignRequest('owner-1', {
      metaIds: [franceId, germanyId],
      levelIds: [beginner, advanced],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Successfully added 4 level assignments to 2 metas',
      addedCount: 4,
    });
    expect(await getMetaLevelIds(franceId)).toEqual([
      { levelId: beginner },
      { levelId: advanced },
    ]);
    expect(await getMetaLevelIds(germanyId)).toEqual([
      { levelId: beginner },
      { levelId: advanced },
    ]);

    // rows were inserted, so the group sync marker resets
    const [group] = await db
      .select()
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    expect(group!.syncedAt).toBeNull();

    const assignmentLog = (await getMetaLogs(groupId)).find(
      (log) => log.entityType === 'meta_levels',
    );
    expect(assignmentLog).toEqual(
      expect.objectContaining({
        mapGroupId: groupId,
        userId: 'owner-1',
        entityType: 'meta_levels',
        entityId: null,
        entityLabel: '2 metas',
        operation: 'update',
        oldValue: null,
        createdAt: expect.any(Number),
      }),
    );
    const newValue = assignmentLog!.newValue as {
      metaTags: string[];
      levelNames: string[];
    };
    expect(newValue.metaTags.sort()).toEqual(['france', 'germany']);
    expect(newValue.levelNames.sort()).toEqual(['Advanced', 'Beginner']);
  });

  test('repeated assignment is a no-op that preserves syncedAt and writes no log', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');
    const franceId = await seedMeta('owner-1', groupId, 'france');

    const first = await bulkLevelAssignRequest('owner-1', {
      metaIds: [franceId],
      levelIds: [beginner],
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      message: 'Successfully added 1 level assignments to 1 metas',
      addedCount: 1,
    });
    await db
      .update(mapGroups)
      .set({ syncedAt: 1_000_000 })
      .where(eq(mapGroups.id, groupId));

    const repeat = await bulkLevelAssignRequest('owner-1', {
      metaIds: [franceId],
      levelIds: [beginner],
    });
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toEqual({
      message:
        'No new levels to add (all selected levels already assigned or invalid)',
      addedCount: 0,
    });
    expect(await getMetaLevelIds(franceId)).toEqual([{ levelId: beginner }]);

    // nothing inserted, so the sync marker survives; only the first request's
    // assignment log exists, no new one
    const [group] = await db
      .select()
      .from(mapGroups)
      .where(eq(mapGroups.id, groupId));
    expect(group!.syncedAt).toBe(1_000_000);
    const assignmentLogs = (await getMetaLogs(groupId)).filter(
      (log) => log.entityType === 'meta_levels',
    );
    expect(assignmentLogs).toHaveLength(1);
    expect(assignmentLogs[0]!.newValue).toEqual({
      metaTags: ['france'],
      levelNames: ['Beginner'],
    });
  });

  test('rejects levels that belong to no requested meta group without touching anything', async () => {
    await seedUser('owner-1');
    const metaGroup = await seedGroup('Meta group');
    const foreignGroup = await seedGroup('Foreign group');
    await seedPermission('owner-1', metaGroup);
    const foreignLevel = await seedLevel(foreignGroup, 'Foreign level');
    const franceId = await seedMeta('owner-1', metaGroup, 'france');
    await db
      .update(mapGroups)
      .set({ syncedAt: 2_000_000 })
      .where(eq(mapGroups.id, metaGroup));

    const response = await bulkLevelAssignRequest('owner-1', {
      metaIds: [franceId],
      levelIds: [foreignLevel],
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message:
        'Invalid levels selected or levels do not belong to the correct map groups',
    });
    expect(await getMetaLevelIds(franceId)).toEqual([]);
    const [group] = await db
      .select()
      .from(mapGroups)
      .where(eq(mapGroups.id, metaGroup));
    expect(group!.syncedAt).toBe(2_000_000);
  });

  test('pairs each meta only with levels of its own group and safely ignores foreign level ids', async () => {
    await seedUser('owner-1');
    const groupA = await seedGroup('Group A');
    const groupB = await seedGroup('Group B');
    const groupC = await seedGroup('Group C');
    await seedPermission('owner-1', groupA);
    await seedPermission('owner-1', groupB);
    const levelA = await seedLevel(groupA, 'Level A');
    const levelB = await seedLevel(groupB, 'Level B');
    const levelC = await seedLevel(groupC, 'Level C');
    const metaA = await seedMeta('owner-1', groupA, 'france');
    const metaB = await seedMeta('owner-1', groupB, 'germany');
    await db
      .update(mapGroups)
      .set({ syncedAt: 3_000_000 })
      .where(inArray(mapGroups.id, [groupA, groupB, groupC]));

    const response = await bulkLevelAssignRequest('owner-1', {
      metaIds: [metaA, metaB],
      levelIds: [levelA, levelB, levelC],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Successfully added 2 level assignments to 2 metas',
      addedCount: 2,
    });
    // no cross-group or foreign-group associations
    expect(await getMetaLevelIds(metaA)).toEqual([{ levelId: levelA }]);
    expect(await getMetaLevelIds(metaB)).toEqual([{ levelId: levelB }]);
    expect(
      await db.select().from(metaLevels).where(eq(metaLevels.levelId, levelC)),
    ).toEqual([]);

    // rows were inserted for groups A and B, resetting their sync markers;
    // group C keeps its marker even though its level id was requested
    for (const [groupId, expected] of [
      [groupA, null],
      [groupB, null],
      [groupC, 3_000_000],
    ] as [number, number | null][]) {
      const [group] = await db
        .select()
        .from(mapGroups)
        .where(eq(mapGroups.id, groupId));
      expect(group!.syncedAt).toBe(expected);
    }
  });
});

describe('POST /api/internal/metas/copy', () => {
  test('reproduces intended fields, images, and tag locations but not levels', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    const beginner = await seedLevel(sourceGroup, 'Beginner');
    const advanced = await seedLevel(sourceGroup, 'Advanced');
    const note = '**bold** copy';
    const footer = 'copied footer';

    const sourceId = await seedMeta('owner-1', sourceGroup, 'france', {
      name: 'France',
      note,
      footer,
      noteFromPlonkit: true,
      levels: [beginner, advanced],
    });
    // image and tag locations are seeded directly: image upload hits S3 and the
    // locations upload path is out of scope for this endpoint
    await db.insert(metaImages).values({
      metaId: sourceId,
      image_url: 'https://img.example/france.jpg',
    });
    await db.insert(mapGroupLocations).values({
      mapGroupId: sourceGroup,
      lat: 48.85,
      lng: 2.35,
      heading: 1,
      pitch: 2,
      zoom: 3,
      panoId: 'pano-france-1',
      extraTag: 'france',
      extraPanoId: 'extra-1',
      extraPanoDate: '2024-01-01',
    });

    const response = await metaCopyRequest('owner-1', {
      metaId: sourceId,
      targetGroupId: targetGroup,
    });
    expect(response.status).toBe(200);

    // the copy keeps every intended field, including the rendered HTML and the
    // image flag, but belongs to the target group under a fresh id
    const [sourceRow] = await db
      .select()
      .from(metas)
      .where(eq(metas.id, sourceId));
    const [copyRow] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'france')),
      );
    expect(copyRow).toBeDefined();
    expect(copyRow!.id).not.toBe(sourceId);
    expect(copyRow).toEqual(
      expect.objectContaining({
        mapGroupId: targetGroup,
        tagName: 'france',
        name: 'France',
        note,
        noteHtml: sourceRow!.noteHtml,
        footer,
        footerHtml: sourceRow!.footerHtml,
        noteFromPlonkit: true,
        hasImage: sourceRow!.hasImage,
      }),
    );

    // levels are deliberately not copied; the source keeps its assignments
    expect(await getMetaLevelIds(copyRow!.id)).toEqual([]);
    expect(await getMetaLevelIds(sourceId)).toEqual([
      { levelId: beginner },
      { levelId: advanced },
    ]);

    // images and the meta's tag locations follow the copy into the target group
    const copiedImages = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, copyRow!.id));
    expect(copiedImages.map((image) => image.image_url)).toEqual([
      'https://img.example/france.jpg',
    ]);
    const copiedLocations = await db
      .select()
      .from(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, targetGroup),
          eq(mapGroupLocations.extraTag, 'france'),
        ),
      );
    expect(copiedLocations).toHaveLength(1);
    expect(copiedLocations[0]).toEqual(
      expect.objectContaining({
        mapGroupId: targetGroup,
        lat: 48.85,
        lng: 2.35,
        heading: 1,
        pitch: 2,
        zoom: 3,
        panoId: 'pano-france-1',
        extraTag: 'france',
        extraPanoId: 'extra-1',
        extraPanoDate: '2024-01-01',
      }),
    );

    // one create log against the target group marking the shared origin
    expect(await getMetaLogs(targetGroup)).toEqual([
      {
        mapGroupId: targetGroup,
        userId: 'owner-1',
        entityType: 'meta',
        entityId: copyRow!.id,
        entityLabel: 'france',
        operation: 'create',
        oldValue: null,
        newValue: {
          tagName: 'france',
          name: 'France',
          note,
          footer,
          noteFromPlonkit: true,
          sharedFromGroupId: sourceGroup,
        },
        createdAt: expect.any(Number),
      },
    ]);
    // nothing new was logged against the source group
    expect(await getMetaLogs(sourceGroup)).toHaveLength(1);
  });

  test('existing target tag is a no-op: returns 200 but copies nothing and writes no log', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    const beginner = await seedLevel(sourceGroup, 'Beginner');
    const targetLevel = await seedLevel(targetGroup, 'Target level');

    const sourceId = await seedMeta('owner-1', sourceGroup, 'france', {
      name: 'France Source',
      note: 'source note',
      levels: [beginner],
    });
    await db.insert(metaImages).values({
      metaId: sourceId,
      image_url: 'https://img.example/source.jpg',
    });
    const targetId = await seedMeta('owner-1', targetGroup, 'france', {
      name: 'France Target',
      note: 'target note',
      levels: [targetLevel],
    });

    const response = await metaCopyRequest('owner-1', {
      metaId: sourceId,
      targetGroupId: targetGroup,
    });
    expect(response.status).toBe(200);

    // no second meta with the same tag appeared in the target group
    const targetMetas = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'france')),
      );
    expect(targetMetas).toHaveLength(1);
    expect(targetMetas[0]!.id).toBe(targetId);
    expect(targetMetas[0]).toEqual(
      expect.objectContaining({ name: 'France Target', note: 'target note' }),
    );

    // nothing leaked from the source into the existing target meta: no image,
    // no tag locations, and the pre-existing level assignment survives
    expect(
      await db.select().from(metaImages).where(eq(metaImages.metaId, targetId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(mapGroupLocations)
        .where(
          and(
            eq(mapGroupLocations.mapGroupId, targetGroup),
            eq(mapGroupLocations.extraTag, 'france'),
          ),
        ),
    ).toHaveLength(0);
    expect(await getMetaLevelIds(targetId)).toEqual([{ levelId: targetLevel }]);

    // the no-op writes no create log: the target group only has its own create
    // log, and the source meta keeps its assignment
    const targetLogs = await getMetaLogs(targetGroup);
    expect(targetLogs).toHaveLength(1);
    expect(targetLogs[0]!.entityId).toBe(targetId);
    expect(targetLogs[0]!.operation).toBe('create');
    expect(await getMetaLevelIds(sourceId)).toEqual([{ levelId: beginner }]);
  });
});
