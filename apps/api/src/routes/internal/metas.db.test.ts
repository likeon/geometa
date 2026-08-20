import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import {
  levels,
  mapGroupChanges,
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
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

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

function metaShareRequest(userId: string, body: unknown) {
  return app.handle(
    new Request('http://localhost/api/internal/metas/share', {
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

async function waitForBlockedQuery(...fragments: string[]) {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const rows = await db.$primary.$client`
      SELECT query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND wait_event_type = 'Lock'
        AND pid <> pg_backend_pid()
    `;
    if (
      rows.some((row) =>
        fragments.every((fragment) =>
          String(row.query).toLowerCase().includes(fragment.toLowerCase()),
        ),
      )
    ) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for blocked query: ${fragments}`);
    }
    await Bun.sleep(0);
  }
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

  test.todo('update rejects cross-group level IDs before persisting anything', async () => {
    await seedUser('owner-1');
    const groupId = await seedGroup('Target group');
    const foreignGroupId = await seedGroup('Foreign group');
    await seedPermission('owner-1', groupId);
    const beginner = await seedLevel(groupId, 'Beginner');
    const foreignLevel = await seedLevel(foreignGroupId, 'Foreign level');

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

    // the foreign level exists, so its FK succeeds: missing group alignment is
    // the only thing that should reject the update
    const rejected = await metaPutRequest(
      'owner-1',
      metaBody({
        id,
        mapGroupId: groupId,
        tagName: 'france',
        name: 'Should Not Persist',
        note: 'should not persist',
        levels: [beginner, foreignLevel],
      }),
    );
    expect(rejected.status).toBeGreaterThanOrEqual(400);
    expect(rejected.status).toBeLessThan(500);

    // scalar fields untouched
    const [row] = await db.select().from(metas).where(eq(metas.id, id));
    expect(row).toEqual(
      expect.objectContaining({
        id,
        mapGroupId: groupId,
        name: 'France',
        note: 'old note',
      }),
    );
    // level association untouched: no cross-group row was inserted
    expect(await getMetaLevelIds(id)).toEqual([{ levelId: beginner }]);
    expect(
      await db
        .select()
        .from(metaLevels)
        .where(eq(metaLevels.levelId, foreignLevel)),
    ).toEqual([]);
    // only the original create log; no update log and nothing in the foreign group
    expect(await getMetaLogs(groupId)).toHaveLength(1);
    expect(await getMetaLogs(foreignGroupId)).toEqual([]);
    // the foreign group's level itself survives untouched
    expect(
      await db.select().from(levels).where(eq(levels.id, foreignLevel)),
    ).toHaveLength(1);
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
      const [location] = await db
        .insert(mapGroupLocations)
        .values({
          mapGroupId: sourceGroup,
          panoId: 'pano-france',
          lat: 1,
          lng: 2,
          heading: 3,
          pitch: 4,
          zoom: 5,
          extraTag: 'france',
        })
        .returning({ id: mapGroupLocations.id });
      await db.insert(mapGroupLocationMetas).values({
        locationId: location!.id,
        metaId: id,
        mapGroupId: sourceGroup,
      });

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
      expect(
        await db
          .select()
          .from(mapGroupLocationMetas)
          .where(eq(mapGroupLocationMetas.metaId, id)),
      ).toEqual([]);
      expect(
        await db
          .select({ mapGroupId: mapGroupLocations.mapGroupId })
          .from(mapGroupLocations)
          .where(eq(mapGroupLocations.id, location!.id)),
      ).toEqual([{ mapGroupId: sourceGroup }]);

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
    const [sourceLocation] = await db
      .insert(mapGroupLocations)
      .values({
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
      })
      .returning({ id: mapGroupLocations.id });
    await db.insert(mapGroupLocationMetas).values({
      locationId: sourceLocation!.id,
      metaId: sourceId,
      mapGroupId: sourceGroup,
    });

    const [existingMeta] = await db
      .insert(metas)
      .values({
        mapGroupId: targetGroup,
        tagName: 'existing',
        name: 'Existing',
        note: '',
      })
      .returning({ id: metas.id });
    const [targetLocation] = await db
      .insert(mapGroupLocations)
      .values({
        mapGroupId: targetGroup,
        lat: 40,
        lng: -3,
        heading: 90,
        pitch: 0,
        zoom: 1,
        panoId: 'pano-france-1',
        extraTag: 'existing',
        extraPanoId: 'target-extra',
        extraPanoDate: '2025-01-01',
      })
      .returning({ id: mapGroupLocations.id });
    await db.insert(mapGroupLocationMetas).values({
      locationId: targetLocation!.id,
      metaId: existingMeta!.id,
      mapGroupId: targetGroup,
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

    // images and the meta's location relationship follow the copy; an existing
    // target pano keeps its own coordinates and camera framing
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
          eq(mapGroupLocations.panoId, 'pano-france-1'),
        ),
      );
    expect(copiedLocations).toHaveLength(1);
    expect(copiedLocations[0]).toEqual(
      expect.objectContaining({
        mapGroupId: targetGroup,
        lat: 40,
        lng: -3,
        heading: 90,
        pitch: 0,
        zoom: 1,
        panoId: 'pano-france-1',
        extraTag: 'existing',
        extraPanoId: 'target-extra',
        extraPanoDate: '2025-01-01',
      }),
    );
    expect(
      (
        await db
          .select({ tagName: metas.tagName })
          .from(mapGroupLocationMetas)
          .innerJoin(metas, eq(metas.id, mapGroupLocationMetas.metaId))
          .where(eq(mapGroupLocationMetas.locationId, targetLocation!.id))
          .orderBy(metas.tagName)
      ).map((row) => row.tagName),
    ).toEqual(['existing', 'france']);

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

  test('links a target pano committed while the copy is waiting', async () => {
    await seedUser('copy-race-owner');
    const sourceGroup = await seedGroup('Copy race source');
    const targetGroup = await seedGroup('Copy race target');
    await seedPermission('copy-race-owner', sourceGroup);
    await seedPermission('copy-race-owner', targetGroup);
    const sourceId = await seedMeta(
      'copy-race-owner',
      sourceGroup,
      'copy-race',
    );
    const [sourceLocation] = await db
      .insert(mapGroupLocations)
      .values({
        mapGroupId: sourceGroup,
        panoId: 'copy-race-pano',
        lat: 1,
        lng: 2,
        heading: 3,
        pitch: 4,
        zoom: 5,
      })
      .returning({ id: mapGroupLocations.id });
    await db.insert(mapGroupLocationMetas).values({
      locationId: sourceLocation!.id,
      metaId: sourceId,
      mapGroupId: sourceGroup,
    });

    let inserted!: () => void;
    const insertedPromise = new Promise<void>((resolve) => {
      inserted = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const targetInsert = db.$primary.transaction(async (tx) => {
      await tx.insert(mapGroupLocations).values({
        mapGroupId: targetGroup,
        panoId: 'copy-race-pano',
        lat: 10,
        lng: 20,
        heading: 30,
        pitch: 40,
        zoom: 50,
      });
      inserted();
      await gate;
    });
    await insertedPromise;

    const copy = metaCopyRequest('copy-race-owner', {
      metaId: sourceId,
      targetGroupId: targetGroup,
    });
    await waitForBlockedQuery(
      'insert into "map_group_locations"',
      'map_group_location_metas',
    );
    release();
    await targetInsert;

    const response = await copy;
    expect(response.status).toBe(200);
    const [copiedMeta] = await db
      .select({ id: metas.id })
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'copy-race')),
      );
    const [targetLocation] = await db
      .select({ id: mapGroupLocations.id })
      .from(mapGroupLocations)
      .where(
        and(
          eq(mapGroupLocations.mapGroupId, targetGroup),
          eq(mapGroupLocations.panoId, 'copy-race-pano'),
        ),
      );
    expect(
      await db
        .select()
        .from(mapGroupLocationMetas)
        .where(
          and(
            eq(mapGroupLocationMetas.locationId, targetLocation!.id),
            eq(mapGroupLocationMetas.metaId, copiedMeta!.id),
          ),
        ),
    ).toHaveLength(1);
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

describe('POST /api/internal/metas/share', () => {
  test('shares metas with images and tag locations and reports the committed count', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    const note = '**bold** share';
    const footer = 'shared footer';

    const franceId = await seedMeta('owner-1', sourceGroup, 'france', {
      name: 'France',
      note,
      footer,
      noteFromPlonkit: true,
    });
    const germanyId = await seedMeta('owner-1', sourceGroup, 'germany', {
      note: 'germany note',
    });
    // image and tag locations are seeded directly: image upload hits S3 and the
    // locations upload path is out of scope for this endpoint
    await db.insert(metaImages).values([
      { metaId: franceId, image_url: 'https://img.example/france.jpg' },
      { metaId: germanyId, image_url: 'https://img.example/germany.jpg' },
    ]);
    const [sourceLocation] = await db
      .insert(mapGroupLocations)
      .values({
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
      })
      .returning({ id: mapGroupLocations.id });
    await db.insert(mapGroupLocationMetas).values({
      locationId: sourceLocation!.id,
      metaId: franceId,
      mapGroupId: sourceGroup,
    });

    const response = await metaShareRequest('owner-1', {
      metaIds: [franceId, germanyId],
      targetGroupId: targetGroup,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      copiedCount: 2,
      totalRequested: 2,
      message: 'Successfully shared 2 of 2 metas',
    });

    // both copies land in the target group under fresh ids
    const [franceCopy] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'france')),
      );
    const [germanyCopy] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'germany')),
      );
    expect(franceCopy).toBeDefined();
    expect(germanyCopy).toBeDefined();
    expect(franceCopy!.id).not.toBe(franceId);
    expect(germanyCopy!.id).not.toBe(germanyId);
    expect(franceCopy).toEqual(
      expect.objectContaining({
        mapGroupId: targetGroup,
        tagName: 'france',
        name: 'France',
        note,
        footer,
        noteFromPlonkit: true,
      }),
    );

    // images follow each copy
    const copiedImages = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, franceCopy!.id));
    expect(copiedImages.map((image) => image.image_url)).toEqual([
      'https://img.example/france.jpg',
    ]);
    // france's tag locations follow into the target group
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

    // one create log per copy against the target group marking the shared origin
    const targetLogs = await getMetaLogs(targetGroup);
    expect(targetLogs).toHaveLength(2);
    expect(targetLogs.map((log) => log.entityLabel).sort()).toEqual([
      'france',
      'germany',
    ]);
    expect(
      targetLogs.every(
        (log) => log.operation === 'create' && log.userId === 'owner-1',
      ),
    ).toBe(true);
    expect(targetLogs.map((log) => log.newValue)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tagName: 'france',
          name: 'France',
          note,
          footer,
          noteFromPlonkit: true,
          sharedFromGroupId: sourceGroup,
        }),
        expect.objectContaining({
          tagName: 'germany',
          note: 'germany note',
          sharedFromGroupId: sourceGroup,
        }),
      ]),
    );
    // nothing new was logged against the source group (only its two creates)
    expect(await getMetaLogs(sourceGroup)).toHaveLength(2);
  });

  test('existing target tag is skipped: the committed count excludes it and the target meta stays untouched', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    const targetLevel = await seedLevel(targetGroup, 'Target level');

    const sourceId = await seedMeta('owner-1', sourceGroup, 'france', {
      name: 'France Source',
      note: 'source note',
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
    const germanyId = await seedMeta('owner-1', sourceGroup, 'germany', {
      note: 'germany note',
    });

    const response = await metaShareRequest('owner-1', {
      metaIds: [sourceId, germanyId],
      targetGroupId: targetGroup,
    });
    expect(response.status).toBe(200);
    // the existing-tag no-op is excluded from the committed count
    expect(await response.json()).toEqual({
      copiedCount: 1,
      totalRequested: 2,
      message: 'Successfully shared 1 of 2 metas',
    });

    // still exactly one 'france' in the target group: the pre-existing one
    const targetFrance = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'france')),
      );
    expect(targetFrance).toHaveLength(1);
    expect(targetFrance[0]!.id).toBe(targetId);
    expect(targetFrance[0]).toEqual(
      expect.objectContaining({ name: 'France Target', note: 'target note' }),
    );

    // nothing leaked from the skipped source meta: no image, no tag locations,
    // and the pre-existing level assignment survives
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

    // the germany meta copies normally with its own create log; the skipped
    // france writes no log against the target group
    const [germanyCopy] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'germany')),
      );
    expect(germanyCopy).toBeDefined();
    const targetLogs = await getMetaLogs(targetGroup);
    expect(targetLogs).toHaveLength(2);
    expect(targetLogs.map((log) => log.entityLabel).sort()).toEqual([
      'france',
      'germany',
    ]);
    const germanyLog = targetLogs.find((log) => log.entityLabel === 'germany')!;
    expect(germanyLog.operation).toBe('create');
    expect(germanyLog.newValue).toEqual(
      expect.objectContaining({
        tagName: 'germany',
        sharedFromGroupId: sourceGroup,
      }),
    );
  });

  test('continues after a per-meta failure and counts only committed copies', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    // the failing meta and its image are seeded before the trigger exists, so
    // only the copy's image insert raises
    const failingId = await seedMeta('owner-1', sourceGroup, 'fail-meta', {
      note: 'will fail',
    });
    await db.insert(metaImages).values({
      metaId: failingId,
      image_url: 'https://img.example/fail.jpg',
    });
    const okId = await seedMeta('owner-1', sourceGroup, 'germany', {
      note: 'germany note',
    });
    await db.insert(metaImages).values({
      metaId: okId,
      image_url: 'https://img.example/ok.jpg',
    });

    // make the failing meta's copy abort mid-transaction: the copy has already
    // inserted its metas row by the time the image insert raises
    await db.$primary.execute(sql`
      CREATE OR REPLACE FUNCTION geometa_test_fail_share()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'intentional share test failure';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.$primary.execute(sql`
      CREATE TRIGGER geometa_test_fail_share_trigger
      BEFORE INSERT ON meta_images
      FOR EACH ROW WHEN (NEW.image_url = 'https://img.example/fail.jpg')
      EXECUTE FUNCTION geometa_test_fail_share()
    `);

    try {
      const response = await metaShareRequest('owner-1', {
        metaIds: [failingId, okId],
        targetGroupId: targetGroup,
      });
      // the per-meta failure is contained: the request succeeds with the other
      // copy, and the count reflects only the committed copy
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        copiedCount: 1,
        totalRequested: 2,
        message: 'Successfully shared 1 of 2 metas',
      });
    } finally {
      await db.$primary.execute(sql`
        DROP TRIGGER IF EXISTS geometa_test_fail_share_trigger ON meta_images
      `);
      await db.$primary.execute(sql`
        DROP FUNCTION IF EXISTS geometa_test_fail_share()
      `);
    }

    // the failed copy left nothing behind: its whole per-meta transaction
    // rolled back the meta and any tag-location writes
    expect(
      await db
        .select()
        .from(metas)
        .where(
          and(
            eq(metas.mapGroupId, targetGroup),
            eq(metas.tagName, 'fail-meta'),
          ),
        ),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(mapGroupLocations)
        .where(
          and(
            eq(mapGroupLocations.mapGroupId, targetGroup),
            eq(mapGroupLocations.extraTag, 'fail-meta'),
          ),
        ),
    ).toEqual([]);

    // the healthy meta was copied in full: meta, image, and log
    const [germanyCopy] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'germany')),
      );
    expect(germanyCopy).toBeDefined();
    expect(germanyCopy!.id).not.toBe(okId);
    const copiedImages = await db
      .select()
      .from(metaImages)
      .where(eq(metaImages.metaId, germanyCopy!.id));
    expect(copiedImages.map((image) => image.image_url)).toEqual([
      'https://img.example/ok.jpg',
    ]);
    const targetLogs = await getMetaLogs(targetGroup);
    expect(targetLogs).toHaveLength(1);
    expect(targetLogs[0]!.entityLabel).toBe('germany');
    expect(targetLogs[0]!.operation).toBe('create');
    expect(targetLogs[0]!.newValue).toEqual(
      expect.objectContaining({
        tagName: 'germany',
        sharedFromGroupId: sourceGroup,
      }),
    );

    // the source meta keeps its own image
    expect(
      await db
        .select()
        .from(metaImages)
        .where(eq(metaImages.metaId, failingId)),
    ).toHaveLength(1);
  });

  test.todo('share remaps levels to same-named target-group levels and omits source-only levels', async () => {
    await seedUser('owner-1');
    const sourceGroup = await seedGroup('Source group');
    const targetGroup = await seedGroup('Target group');
    await seedPermission('owner-1', sourceGroup);
    await seedPermission('owner-1', targetGroup);
    // the same level name exists in both groups under distinct ids, plus one
    // level that only the source group has
    const sourceBeginner = await seedLevel(sourceGroup, 'Beginner');
    const targetBeginner = await seedLevel(targetGroup, 'Beginner');
    const sourceOnly = await seedLevel(sourceGroup, 'Source Only');

    const sourceId = await seedMeta('owner-1', sourceGroup, 'france', {
      name: 'France',
      note: 'share remap note',
      levels: [sourceBeginner, sourceOnly],
    });

    const response = await metaShareRequest('owner-1', {
      metaIds: [sourceId],
      targetGroupId: targetGroup,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      copiedCount: 1,
      totalRequested: 1,
      message: 'Successfully shared 1 of 1 metas',
    });

    const [copyRow] = await db
      .select()
      .from(metas)
      .where(
        and(eq(metas.mapGroupId, targetGroup), eq(metas.tagName, 'france')),
      );
    expect(copyRow).toBeDefined();

    // desired: the matching level name maps to the target group's own level id
    // and the source-only level is safely omitted from the copy
    expect(await getMetaLevelIds(copyRow!.id)).toEqual([
      { levelId: targetBeginner },
    ]);

    // desired: no cross-group meta_levels row links a target meta to a
    // source-group level
    const targetLevelIds = new Set(
      (
        await db
          .select({ id: levels.id })
          .from(levels)
          .where(eq(levels.mapGroupId, targetGroup))
      ).map((level) => level.id),
    );
    const copyAssignments = await db
      .select({ levelId: metaLevels.levelId })
      .from(metaLevels)
      .where(eq(metaLevels.metaId, copyRow!.id));
    expect(
      copyAssignments.every((assignment) =>
        targetLevelIds.has(assignment.levelId),
      ),
    ).toBe(true);

    // the source meta keeps its own level assignments untouched
    expect(await getMetaLevelIds(sourceId)).toEqual([
      { levelId: sourceBeginner },
      { levelId: sourceOnly },
    ]);

    // the target copy is audited as a create sharing the source origin; the
    // source group logs nothing new
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
          note: 'share remap note',
          footer: '',
          noteFromPlonkit: false,
          sharedFromGroupId: sourceGroup,
        },
        createdAt: expect.any(Number),
      },
    ]);
    expect(await getMetaLogs(sourceGroup)).toHaveLength(1);
  });
});
