import {
  levels,
  locationMetas,
  mapGroupChanges,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  metaImages,
  metas,
  regions,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { logChange } from '@api/lib/internal/changes';
import { createMapGroup } from '@api/lib/internal/map-groups';
import {
  MissingLevelsError,
  uploadMetas,
} from '@api/lib/internal/metas-upload';
import { ensureOwner, ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { geoguessrMapJson } from '@api/lib/internal/utils';
import {
  getSynchronizedGroupMapSnapshots,
  havePublishableMapLocationsChanged,
} from '@api/lib/userscript/map-snapshots';
import { isPgError } from '@api/lib/utils/common';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const mapGroupsRouter = new Elysia({ prefix: '/map-groups' })
  .use(auth())
  .get(
    '/',
    async ({ userId }) => {
      const userGroups = await db.$primary
        .select({
          id: mapGroups.id,
          name: mapGroups.name,
          locationCount:
            sql<number>`(SELECT COUNT(${mapGroupLocations.id}) FROM ${mapGroupLocations} WHERE ${mapGroupLocations.mapGroupId} = ${mapGroups.id})`.mapWith(
              Number,
            ),
          metasCount:
            sql<number>`(SELECT COUNT(${metas.id}) FROM ${metas} WHERE ${metas.mapGroupId} = ${mapGroups.id})`.mapWith(
              Number,
            ),
          mapsCount:
            sql<number>`(SELECT COUNT(${maps.id}) FROM ${maps} WHERE ${maps.mapGroupId} = ${mapGroups.id})`.mapWith(
              Number,
            ),
          gamesPlayed:
            sql<number>`(SELECT COALESCE(SUM(${maps.numberOfGamesPlayed}), 0) FROM ${maps} WHERE ${maps.mapGroupId} = ${mapGroups.id})`.mapWith(
              Number,
            ),
        })
        .from(mapGroups)
        .innerJoin(
          mapGroupPermissions,
          eq(mapGroupPermissions.mapGroupId, mapGroups.id),
        )
        .where(eq(mapGroupPermissions.userId, userId))
        .orderBy(desc(mapGroups.id));

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });
      let allGroups = null;
      if (user?.isSuperadmin) {
        allGroups = await db.$primary
          .select({
            id: mapGroups.id,
            name: mapGroups.name,
            authors: sql<string | null>`
              (SELECT string_agg(u.username, ', ')
               FROM map_group_permissions mgp
                      JOIN "user" u ON u.id = mgp.user_id
               WHERE mgp.map_group_id = map_groups.id)`,
            locationCount: sql<number>`count
              (${mapGroupLocations.id})`.mapWith(Number),
          })
          .from(mapGroups)
          .leftJoin(
            mapGroupLocations,
            eq(mapGroups.id, mapGroupLocations.mapGroupId),
          )
          .groupBy(mapGroups.id)
          .orderBy(
            desc(sql<number>`count
            (${mapGroupLocations.id})`),
          );
      }

      return { userGroups, allGroups };
    },
    { userId: true },
  )
  .post(
    '/',
    async ({ body, userId }) => {
      const id = await createMapGroup(userId, body.name);
      return { id };
    },
    {
      body: t.Object({ name: t.String({ minLength: 1 }) }),
      userId: true,
    },
  )
  .get(
    '/:id/page',
    async ({ params: { id: groupId }, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);
      const [group, user] = await Promise.all([
        db.$primary.query.mapGroups.findFirst({
          with: {
            metas: {
              orderBy: [asc(metas.tagName)],
              columns: { noteHtml: false, footerHtml: false },
              with: {
                metaLevels: { with: { level: true } },
                images: {
                  orderBy: [asc(metaImages.order), asc(metaImages.id)],
                },
                locationsCount: true,
              },
            },
            levels: {
              orderBy: [asc(levels.name)],
            },
          },
          where: eq(mapGroups.id, groupId),
          extras: {
            hasUnsyncedData: sql<boolean>`
            EXISTS (SELECT 1
             FROM map_group_locations mgl
             WHERE mgl.map_group_id = ${mapGroups.id}
               AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < mgl.modified_at))
            OR EXISTS (SELECT 1
             FROM metas m
             WHERE m.map_group_id = ${mapGroups.id}
               AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at))
            OR EXISTS (SELECT 1
             FROM maps m
             WHERE m.map_group_id = ${mapGroups.id}
               AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at))
            `.as('has_unsynced_data'),
          },
        }),
        db.$primary.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { apiToken: false },
          with: { permissions: { with: { mapGroup: true } } },
        }),
      ]);

      if (!group) {
        return status(404);
      }

      return { group, user, role };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/maps-page',
    async ({ params: { id: groupId }, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        with: {
          maps: {
            extras: {
              locationsCount:
                sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`
                  .mapWith(Number)
                  .as('locations_count'),
              metasCount:
                sql`(select count(distinct ml.meta_id) from map_locations_view ml where ml.map_id = ${maps.id})`
                  .mapWith(Number)
                  .as('metas_count'),
            },
            with: {
              mapLevels: { with: { level: true } },
              mapRegions: { with: { region: true } },
              filters: true,
            },
          },
        },
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        return status(404);
      }

      const [levelList, regionList, user] = await Promise.all([
        db.$primary.query.levels.findMany({
          where: eq(levels.mapGroupId, groupId),
        }),
        db.$primary.query.regions.findMany({
          orderBy: [asc(regions.ordering)],
        }),
        db.$primary.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { apiToken: false },
        }),
      ]);

      if (!user) {
        return status(500);
      }

      return { group, levelList, regionList, user, role };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/levels-page',
    async ({ params: { id: groupId }, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        with: {
          levels: {
            orderBy: [asc(levels.name)],
          },
        },
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        return status(404);
      }

      return { group, role };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .put(
    '/:id/levels',
    async ({ params: { id: groupId }, body, userId }) => {
      await ensureOwner(userId, groupId);

      const { id, name } = body;
      if (id === undefined) {
        await db.$primary.transaction(async (tx) => {
          const inserted = await tx
            .insert(levels)
            .values({ name, mapGroupId: groupId })
            .onConflictDoNothing()
            .returning({ id: levels.id });
          if (inserted.length) {
            await logChange(tx, {
              mapGroupId: groupId,
              userId,
              entityType: 'level',
              entityId: inserted[0].id,
              entityLabel: name,
              operation: 'create',
              newValue: { name },
            });
          }
        });
      } else {
        const oldLevel = await db.$primary.query.levels.findFirst({
          where: and(eq(levels.id, id), eq(levels.mapGroupId, groupId)),
        });
        await db.$primary.transaction(async (tx) => {
          await tx
            .update(levels)
            .set({ name })
            .where(and(eq(levels.id, id), eq(levels.mapGroupId, groupId)));
          if (oldLevel) {
            await logChange(tx, {
              mapGroupId: groupId,
              userId,
              entityType: 'level',
              entityId: id,
              entityLabel: name,
              operation: 'update',
              oldValue: { name: oldLevel.name },
              newValue: { name },
            });
          }
        });
      }
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        id: t.Optional(t.Integer()),
        name: t.String({ minLength: 1 }),
      }),
      userId: true,
    },
  )
  .delete(
    '/:id/levels/:levelId',
    async ({ params: { id: groupId, levelId }, userId, status }) => {
      await ensureOwner(userId, groupId);

      const deleted = await db.$primary.transaction(async (tx) => {
        const deletedRows = await tx
          .delete(levels)
          .where(and(eq(levels.id, levelId), eq(levels.mapGroupId, groupId)))
          .returning({ id: levels.id, name: levels.name });
        if (deletedRows.length) {
          await logChange(tx, {
            mapGroupId: groupId,
            userId,
            entityType: 'level',
            entityId: levelId,
            entityLabel: deletedRows[0].name,
            operation: 'delete',
            oldValue: { name: deletedRows[0].name },
          });
        }
        return deletedRows;
      });
      if (deleted.length === 0) {
        return status(404);
      }
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer(), levelId: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/changes-page',
    async ({ params: { id: groupId }, query, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        columns: { id: true, name: true, syncedAt: true },
        where: eq(mapGroups.id, groupId),
      });
      if (!group) {
        return status(404);
      }

      const PAGE_SIZE = 100;

      // keyset cursor over (created_at, id) desc, encoded "<createdAt>_<id>"
      const MAX_INT = 2147483647;
      let cursor: { createdAt: number; id: number } | null = null;
      if (query.before) {
        const parts = query.before.split('_').map(Number);
        if (
          parts.length !== 2 ||
          !Number.isSafeInteger(parts[0]) ||
          parts[0] < 0 ||
          parts[0] > MAX_INT ||
          !Number.isSafeInteger(parts[1]) ||
          parts[1] < 0
        ) {
          return status(400, { message: 'Invalid cursor' });
        }
        cursor = { createdAt: parts[0], id: parts[1] };
      }

      // synced/unsynced boundary: synced_at, or (when a settings change has
      // reset it to null) the latest sync marker so pending edits still show
      // as unsynced instead of being dumped into history
      let boundary = group.syncedAt;
      if (boundary === null) {
        const latestMarker = await db.$primary.query.mapGroupChanges.findFirst({
          where: and(
            eq(mapGroupChanges.mapGroupId, groupId),
            eq(mapGroupChanges.entityType, 'sync'),
          ),
          orderBy: [desc(mapGroupChanges.createdAt), desc(mapGroupChanges.id)],
          columns: { createdAt: true },
        });
        boundary = latestMarker?.createdAt ?? null;
      }

      const pageConditions = [eq(mapGroupChanges.mapGroupId, groupId)];
      if (cursor) {
        pageConditions.push(
          sql`(${mapGroupChanges.createdAt}, ${mapGroupChanges.id}) < (${cursor.createdAt}, ${cursor.id})`,
        );
      } else if (boundary !== null) {
        pageConditions.push(lte(mapGroupChanges.createdAt, boundary));
      } else {
        // no boundary at all (never synced, no markers): there is no synced
        // history - everything belongs to the unsynced list
        pageConditions.push(sql`false`);
      }
      const page = await db.$primary.query.mapGroupChanges.findMany({
        where: and(...pageConditions),
        orderBy: [desc(mapGroupChanges.createdAt), desc(mapGroupChanges.id)],
        limit: PAGE_SIZE + 1,
        with: { user: { columns: { username: true } } },
      });
      const hasMore = page.length > PAGE_SIZE;

      // the first page always carries every unsynced entry on top of the
      // paginated synced history
      let unsyncedChanges: typeof page = [];
      if (!cursor) {
        const unsyncedConditions = [eq(mapGroupChanges.mapGroupId, groupId)];
        if (boundary !== null) {
          unsyncedConditions.push(gt(mapGroupChanges.createdAt, boundary));
        }
        unsyncedChanges = await db.$primary.query.mapGroupChanges.findMany({
          where: and(...unsyncedConditions),
          orderBy: [desc(mapGroupChanges.createdAt), desc(mapGroupChanges.id)],
          limit: 500,
          with: { user: { columns: { username: true } } },
        });
      }

      return {
        group,
        role,
        unsyncedChanges,
        changes: page.slice(0, PAGE_SIZE),
        hasMore,
      };
    },
    {
      params: t.Object({ id: t.Integer() }),
      query: t.Object({ before: t.Optional(t.String()) }),
      userId: true,
    },
  )
  .get(
    '/:id/settings-page',
    async ({ params: { id: groupId }, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        extras: {
          metasCount: sql<number>`(SELECT COUNT(*)
                                   FROM metas m
                                   WHERE m.map_group_id = ${groupId})`.as(
            'metas_count',
          ),
          locationsCount: sql<number>`(SELECT COUNT(*)
                                       FROM map_group_locations mgl
                                       WHERE mgl.map_group_id = ${groupId})`.as(
            'locations_count',
          ),
        },
        with: {
          permissions: {
            with: { user: { columns: { apiToken: false } } },
          },
        },
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        return status(404);
      }

      return { group, role };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .delete(
    '/:id',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensureOwner(userId, groupId);
      await db.delete(mapGroups).where(eq(mapGroups.id, groupId));
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .post(
    '/:id/permissions',
    async ({ params: { id: groupId }, body, userId, status }) => {
      await ensureOwner(userId, groupId);

      const username = body.username.startsWith('@')
        ? body.username.slice(1)
        : body.username;

      const user = (
        await db.$primary
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.username, username))
      )[0];
      if (!user) {
        return status(400, {
          field: 'username',
          message: 'Discord user with this username is not in our database',
        });
      }

      const existingPermission = await db.$primary
        .select({ id: mapGroupPermissions.id })
        .from(mapGroupPermissions)
        .where(
          and(
            eq(mapGroupPermissions.mapGroupId, groupId),
            eq(mapGroupPermissions.userId, user.id),
          ),
        )
        .limit(1);
      if (existingPermission.length) {
        return status(400, {
          field: 'username',
          message: 'This user already has the permissions',
        });
      }

      // role is optional so a not-yet-updated frontend can still share groups
      // during a rolling deploy
      const role = body.role ?? 'editor';
      await db.$primary.insert(mapGroupPermissions).values({
        mapGroupId: groupId,
        userId: user.id,
        role,
      });
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        username: t.String({ minLength: 1 }),
        role: t.Optional(t.Union([t.Literal('owner'), t.Literal('editor')])),
      }),
      userId: true,
    },
  )
  .patch(
    '/:id/permissions/:permissionId',
    async ({ params: { id: groupId, permissionId }, body, userId, status }) => {
      await ensureOwner(userId, groupId);

      // the whole check-and-mutate runs in one transaction with the group's
      // permission rows locked, so concurrent demotions can't race past the
      // last-owner guard
      const failure = await db.$primary.transaction(async (tx) => {
        const permissions = await tx
          .select()
          .from(mapGroupPermissions)
          .where(eq(mapGroupPermissions.mapGroupId, groupId))
          .for('update');
        const permission = permissions.find((p) => p.id === permissionId);
        if (!permission) {
          return 'Permission not found';
        }
        if (permission.userId === userId) {
          return "Can't change your own role";
        }
        if (
          permission.role === 'owner' &&
          body.role === 'editor' &&
          !permissions.some((p) => p.role === 'owner' && p.id !== permissionId)
        ) {
          return 'A group must keep at least one owner';
        }

        await tx
          .update(mapGroupPermissions)
          .set({ role: body.role })
          .where(eq(mapGroupPermissions.id, permissionId));
        return null;
      });
      if (failure) {
        return status(400, { field: 'permissionId', message: failure });
      }
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer(), permissionId: t.Integer() }),
      body: t.Object({
        role: t.Union([t.Literal('owner'), t.Literal('editor')]),
      }),
      userId: true,
    },
  )
  .delete(
    '/:id/permissions/:permissionId',
    async ({ params: { id: groupId, permissionId }, userId, status }) => {
      await ensureOwner(userId, groupId);

      // see PATCH above: locked check-and-mutate to prevent the last-owner
      // guard from racing
      const failure = await db.$primary.transaction(async (tx) => {
        const permissions = await tx
          .select()
          .from(mapGroupPermissions)
          .where(eq(mapGroupPermissions.mapGroupId, groupId))
          .for('update');
        const permission = permissions.find((p) => p.id === permissionId);
        if (!permission) {
          return 'Permission not found';
        }
        if (permission.userId === userId) {
          return "Can't strip your own permissions";
        }
        if (
          permission.role === 'owner' &&
          !permissions.some((p) => p.role === 'owner' && p.id !== permissionId)
        ) {
          return 'A group must keep at least one owner';
        }

        await tx
          .delete(mapGroupPermissions)
          .where(eq(mapGroupPermissions.id, permissionId));
        return null;
      });
      if (failure) {
        return status(400, { field: 'permissionId', message: failure });
      }
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer(), permissionId: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id',
    async ({ params: { id: groupId }, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        return status(404);
      }

      return { ...group, role };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .patch(
    '/:id',
    async ({ params: { id: groupId }, body, userId, status }) => {
      await ensureOwner(userId, groupId);
      const oldGroup = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!oldGroup) {
        return status(404);
      }
      await db.$primary.transaction(async (tx) => {
        await tx
          .update(mapGroups)
          .set({ name: body.name })
          .where(eq(mapGroups.id, groupId));
        await logChange(tx, {
          mapGroupId: groupId,
          userId,
          entityType: 'group',
          entityId: groupId,
          entityLabel: body.name,
          operation: 'update',
          oldValue: { name: oldGroup.name },
          newValue: { name: body.name },
        });
      });
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({ name: t.String({ minLength: 1 }) }),
      userId: true,
    },
  )
  .post(
    '/:id/locations/upload',
    async ({ params: { id: groupId }, body, userId, status }) => {
      const role = await ensurePermissions(userId, groupId);

      if (role === 'editor') {
        if (!body.scopeTag) {
          return status(403, {
            message: 'Editors can only upload locations for a specific meta',
          });
        }
        if (body.uploadMode === 'full') {
          return status(403, {
            message: 'Editors cannot replace all locations in a group',
          });
        }
      }
      if (body.scopeTag && body.uploadMode === 'full') {
        return status(400, {
          message:
            'Full replacement cannot be combined with a scoped upload - it would delete all other metas locations',
        });
      }

      let locations = body.locations;
      let ignoredCount = 0;
      let scopedMetaId: number | null = null;
      if (body.scopeTag) {
        const scopedMeta = await db.$primary.query.metas.findFirst({
          where: and(
            eq(metas.mapGroupId, groupId),
            eq(metas.tagName, body.scopeTag),
          ),
        });
        if (!scopedMeta) {
          return status(400, {
            message: `There is no meta with tag "${body.scopeTag}" in this group`,
          });
        }

        locations = body.locations.filter(
          (location) => location.extraTag === body.scopeTag,
        );
        ignoredCount = body.locations.length - locations.length;
        if (locations.length === 0) {
          return status(400, {
            message: `The uploaded file contains no locations with tag "${body.scopeTag}"`,
          });
        }
        scopedMetaId = scopedMeta.id;
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const upsertValues = locations.map((location) => ({
        ...location,
        extraPanoDate: location.extraPanoDate ?? null,
        mapGroupId: groupId,
        updatedAt: currentTimestamp,
        modifiedAt: currentTimestamp, // default value - not being set on conflict
      }));
      const usedTags = new Set(locations.map((location) => location.extraTag));

      const BATCH_SIZE = 1000;
      let affectedCount = 0;
      try {
        await db.$primary.transaction(async (trx) => {
          // Step 1: Batched upsert operation
          for (let i = 0; i < upsertValues.length; i += BATCH_SIZE) {
            const batch = upsertValues.slice(i, i + BATCH_SIZE);

            const affected = await trx
              .insert(mapGroupLocations)
              .values(batch)
              .onConflictDoUpdate({
                target: [
                  mapGroupLocations.mapGroupId,
                  mapGroupLocations.panoId,
                ],
                set: {
                  heading: sql`excluded.heading`,
                  pitch: sql`excluded.pitch`,
                  zoom: sql`excluded.zoom`,
                  panoId: sql`excluded.pano_id`,
                  extraTag: sql`excluded.extra_tag`,
                  extraPanoId: sql`excluded.extra_pano_id`,
                  extraPanoDate: sql`excluded.extra_pano_date`,
                  updatedAt: sql`excluded.updated_at`,
                },
                // scoped uploads must not steal panos already belonging to
                // another meta's tag in this group
                ...(body.scopeTag && {
                  setWhere: eq(mapGroupLocations.extraTag, body.scopeTag),
                }),
              })
              .returning({ id: mapGroupLocations.id });
            affectedCount += affected.length;
          }

          // Step 2: Delete records based on upload mode
          let deletedCount = 0;
          if (body.uploadMode === 'full') {
            // Full replacement: delete all locations not in current upload
            const deleted = await trx
              .delete(mapGroupLocations)
              .where(
                and(
                  eq(mapGroupLocations.mapGroupId, groupId),
                  or(
                    isNull(mapGroupLocations.updatedAt),
                    lt(mapGroupLocations.updatedAt, currentTimestamp),
                  ),
                ),
              )
              .returning({ id: mapGroupLocations.id });
            deletedCount = deleted.length;
          } else if (body.uploadMode === 'tagReplace') {
            // Tag-based replacement: delete only locations with tags present in upload
            const deleted = await trx
              .delete(mapGroupLocations)
              .where(
                and(
                  eq(mapGroupLocations.mapGroupId, groupId),
                  inArray(mapGroupLocations.extraTag, Array.from(usedTags)),
                  or(
                    isNull(mapGroupLocations.updatedAt),
                    lt(mapGroupLocations.updatedAt, currentTimestamp),
                  ),
                ),
              )
              .returning({ id: mapGroupLocations.id });
            deletedCount = deleted.length;
          }
          // For 'partial' mode: no deletions, just upserts

          await logChange(trx, {
            mapGroupId: groupId,
            userId,
            entityType: 'location_batch',
            entityId: scopedMetaId,
            entityLabel: body.scopeTag ?? `${usedTags.size} tags`,
            operation: 'update',
            newValue: {
              uploadMode: body.uploadMode,
              count: affectedCount,
              deletedCount,
              ignoredCount,
              conflictCount: upsertValues.length - affectedCount,
              tags: Array.from(usedTags).slice(0, 100),
            },
          });

          // Step 3: Insert tags into metas table
          // (skipped for scoped uploads - the target meta is validated to exist)
          if (!body.scopeTag && usedTags.size > 0) {
            const metaInsertValues = Array.from(usedTags).map((tagName) => ({
              mapGroupId: groupId,
              tagName: tagName,
              name: '',
              note: '',
              modifiedAt: currentTimestamp,
            }));
            const createdMetas = await trx
              .insert(metas)
              .values(metaInsertValues)
              .onConflictDoNothing()
              .returning({ id: metas.id, tagName: metas.tagName });
            await logChange(
              trx,
              createdMetas.map((meta) => ({
                mapGroupId: groupId,
                userId,
                entityType: 'meta' as const,
                entityId: meta.id,
                entityLabel: meta.tagName,
                operation: 'create' as const,
                newValue: {
                  tagName: meta.tagName,
                  createdByLocationUpload: true,
                },
              })),
            );
          }
        });
      } catch (error) {
        // cardinality violation: ON CONFLICT DO UPDATE hit the same row twice,
        // i.e. the upload contains duplicate panoIds
        if (isPgError(error, '21000')) {
          return status(409, {
            message:
              'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.',
          });
        }
        throw error;
      }

      return {
        count: affectedCount,
        ignoredCount,
        conflictCount: upsertValues.length - affectedCount,
      };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        uploadMode: t.Union([
          t.Literal('partial'),
          t.Literal('full'),
          t.Literal('tagReplace'),
        ]),
        scopeTag: t.Optional(t.String({ minLength: 1 })),
        locations: t.Array(
          t.Object({
            lat: t.Number(),
            lng: t.Number(),
            heading: t.Number(),
            pitch: t.Number(),
            zoom: t.Number(),
            panoId: t.String(),
            extraTag: t.String(),
            extraPanoId: t.Union([t.String(), t.Null()]),
            extraPanoDate: t.Optional(t.Union([t.String(), t.Null()])),
          }),
        ),
      }),
      userId: true,
    },
  )
  .post(
    '/:id/metas/upload',
    async ({ params: { id: groupId }, body, userId, status }) => {
      await ensureOwner(userId, groupId);

      try {
        await uploadMetas(
          groupId,
          userId,
          body.metas,
          body.partialUpload,
          body.autoCreateLevels,
        );
      } catch (error) {
        if (error instanceof MissingLevelsError) {
          return status(400, { message: error.message });
        }
        throw error;
      }
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        partialUpload: t.Boolean(),
        autoCreateLevels: t.Boolean(),
        metas: t.Array(
          t.Object({
            tagName: t.String(),
            metaName: t.String(),
            note: t.String(),
            footer: t.Optional(t.Union([t.String(), t.Null()])),
            levels: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
            images: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
          }),
          { minItems: 1 },
        ),
      }),
      userId: true,
    },
  )
  .post(
    '/:id/sync',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensureOwner(userId, groupId);
      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!group) {
        return status(404);
      }
      const snapshotsBeforeSync =
        await getSynchronizedGroupMapSnapshots(groupId);
      const syncedAt = await syncMapGroup(group);
      const snapshotsAfterSync =
        await getSynchronizedGroupMapSnapshots(groupId);
      // stamped with the sync's own timestamp so the marker sits exactly on
      // the synced/unsynced boundary instead of classifying itself unsynced
      await logChange(db.$primary, {
        mapGroupId: groupId,
        userId,
        entityType: 'sync',
        entityId: groupId,
        entityLabel: 'changes published',
        operation: 'update',
        createdAt: syncedAt,
      });
      return {
        hasMapUpdates: havePublishableMapLocationsChanged(
          snapshotsBeforeSync,
          snapshotsAfterSync,
        ),
      };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .post(
    '/:id/download-locations',
    async ({ params: { id: groupId }, body, userId, set }) => {
      await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        set.status = 404;
        return { error: 'Map group not found' };
      }

      // If no meta IDs provided, return all locations for the group
      let whereClause: ReturnType<typeof and> | ReturnType<typeof eq>;
      if (body.metaIds && body.metaIds.length > 0) {
        whereClause = and(
          eq(locationMetas.mapGroupId, groupId),
          inArray(locationMetas.metaId, body.metaIds),
        );
      } else {
        whereClause = eq(locationMetas.mapGroupId, groupId);
      }

      const locations = await db
        .select()
        .from(locationMetas)
        .where(whereClause);

      const mapData = geoguessrMapJson(
        body.metaIds && body.metaIds.length > 0
          ? `${group.name}_selected_metas`
          : group.name,
        locations,
      );

      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] =
        `attachment; filename="${mapData.name}.json"`;

      return mapData;
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Optional(t.Array(t.Integer())),
      }),
      userId: true,
      response: {
        200: t.Object({
          name: t.String(),
          customCoordinates: t.Array(
            t.Object({
              lat: t.Number(),
              lng: t.Number(),
              heading: t.Number(),
              pitch: t.Number(),
              zoom: t.Number(),
              panoId: t.Union([t.String(), t.Null()]),
              countryCode: t.Union([t.String(), t.Null()]),
              stateCode: t.Union([t.String(), t.Null()]),
              extra: t.Object({
                panoId: t.Union([t.String(), t.Null()]),
                tags: t.Array(t.String()),
                panoDate: t.Union([t.String(), t.Null()]),
              }),
            }),
          ),
          extra: t.Object({
            tags: t.Object({}),
            infoCoordinates: t.Array(t.Any()),
          }),
        }),
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    '/:id/download-metas',
    async ({ params: { id: groupId }, body, userId, set }) => {
      await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        set.status = 404;
        return { error: 'Map group not found' };
      }

      // If no meta IDs provided, return all metas for the group
      let whereClause: ReturnType<typeof and> | ReturnType<typeof eq>;
      if (body.metaIds && body.metaIds.length > 0) {
        whereClause = and(
          eq(metas.mapGroupId, groupId),
          inArray(metas.id, body.metaIds),
        );
      } else {
        whereClause = eq(metas.mapGroupId, groupId);
      }

      const selectedMetas = await db.$primary.query.metas.findMany({
        where: whereClause,
        orderBy: [sql`${metas.id} ASC`],
        with: {
          metaLevels: { with: { level: true } },
          images: true,
        },
      });

      const result = selectedMetas.map((meta) => ({
        tagName: meta.tagName,
        metaName: meta.name,
        note: meta.note,
        footer: meta.footer,
        levels: meta.metaLevels.map((metaLevel) => metaLevel.level.name),
        images: meta.images.map((image) => image.image_url),
      }));

      const fileName =
        body.metaIds && body.metaIds.length > 0
          ? `${group.name}_selected_metas`
          : `${group.name}_metas`;

      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] =
        `attachment; filename="${fileName}.json"`;

      return {
        name: fileName,
        metas: result,
      };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Optional(t.Array(t.Integer())),
      }),
      userId: true,
      response: {
        200: t.Object({
          name: t.String(),
          metas: t.Array(
            t.Object({
              tagName: t.String(),
              metaName: t.String(),
              note: t.String(),
              footer: t.String(),
              levels: t.Array(t.String()),
              images: t.Array(t.String()),
            }),
          ),
        }),
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    '/:id/settings',
    async ({ params: { id: groupId }, body, userId, status }) => {
      await ensureOwner(userId, groupId);
      const oldGroup = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!oldGroup) {
        return status(404);
      }
      // a no-op save must not invalidate the group's sync state
      if (
        oldGroup.syncIncludeLocationsNotOnStreetView ===
        body.syncIncludeLocationsNotOnStreetView
      ) {
        return status(200);
      }
      await db.$primary.transaction(async (tx) => {
        await tx
          .update(mapGroups)
          // need to reset syncedAt
          .set({ ...body, syncedAt: null })
          .where(eq(mapGroups.id, groupId));
        await logChange(tx, {
          mapGroupId: groupId,
          userId,
          entityType: 'settings',
          entityId: groupId,
          operation: 'update',
          oldValue: {
            syncIncludeLocationsNotOnStreetView:
              oldGroup.syncIncludeLocationsNotOnStreetView,
          },
          newValue: {
            syncIncludeLocationsNotOnStreetView:
              body.syncIncludeLocationsNotOnStreetView,
          },
        });
      });
      return status(200);
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ syncIncludeLocationsNotOnStreetView: t.Boolean() }),
      userId: true,
    },
  );
