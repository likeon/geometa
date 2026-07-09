import {
  levels,
  locationMetas,
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
import { createMapGroup } from '@api/lib/internal/map-groups';
import {
  MissingLevelsError,
  uploadMetas,
} from '@api/lib/internal/metas-upload';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
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
      await ensurePermissions(userId, groupId);
      const [group, user] = await Promise.all([
        db.$primary.query.mapGroups.findFirst({
          with: {
            metas: {
              orderBy: [asc(metas.tagName)],
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
            hasUnsycnedData: sql<boolean>`
            EXISTS (SELECT 1
             FROM map_group_locations mgl
             WHERE mgl.map_group_id = ${mapGroups.id}
               AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < mgl.modified_at))
            OR EXISTS(SELECT 1
             FROM metas m
             WHERE m.map_group_id = ${mapGroups.id} AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at)
            OR EXISTS(
             SELECT 1
             FROM maps m
             WHERE m.map_group_id = ${mapGroups.id} AND (${mapGroups.syncedAt} IS NULL OR ${mapGroups.syncedAt} < m.modified_at)
            )
            )`.as('has_unsynced_data'),
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

      return { group, user };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/maps-page',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);

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

      return { group, levelList, regionList, user };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/levels-page',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);

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

      return { group };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .put(
    '/:id/levels',
    async ({ params: { id: groupId }, body, userId }) => {
      await ensurePermissions(userId, groupId);

      const { id, name } = body;
      if (id === undefined) {
        await db
          .insert(levels)
          .values({ name, mapGroupId: groupId })
          .onConflictDoNothing();
      } else {
        await db
          .update(levels)
          .set({ name })
          .where(and(eq(levels.id, id), eq(levels.mapGroupId, groupId)));
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
    async ({ params: { levelId }, userId, status }) => {
      const level = await db.$primary.query.levels.findFirst({
        where: eq(levels.id, levelId),
      });
      if (!level) {
        return status(404);
      }
      await ensurePermissions(userId, level.mapGroupId);

      await db.delete(levels).where(eq(levels.id, levelId));
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer(), levelId: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/settings-page',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);

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

      return { group };
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .delete(
    '/:id',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);
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
      await ensurePermissions(userId, groupId);

      const username = body.username.startsWith('@')
        ? body.username.slice(1)
        : body.username;

      const user = (
        await db.$primary
          .select({ id: users.id })
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

      await db
        .insert(mapGroupPermissions)
        .values({ mapGroupId: groupId, userId: user.id });
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({ username: t.String({ minLength: 1 }) }),
      userId: true,
    },
  )
  .delete(
    '/:id/permissions/:permissionId',
    async ({ params: { id: groupId, permissionId }, userId, status }) => {
      await ensurePermissions(userId, groupId);

      const permission = await db.$primary.query.mapGroupPermissions.findFirst({
        where: and(
          eq(mapGroupPermissions.id, permissionId),
          eq(mapGroupPermissions.mapGroupId, groupId),
        ),
      });
      if (!permission) {
        return status(400, {
          field: 'permissionId',
          message: 'Permission not found',
        });
      }
      if (permission.userId === userId) {
        return status(400, {
          field: 'permissionId',
          message: "Can't strip your own permissions",
        });
      }

      await db
        .delete(mapGroupPermissions)
        .where(eq(mapGroupPermissions.id, permissionId));
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
      await ensurePermissions(userId, groupId);

      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });

      if (!group) {
        return status(404);
      }

      return group;
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .patch(
    '/:id',
    async ({ params: { id: groupId }, body, userId, status }) => {
      await ensurePermissions(userId, groupId);
      const updated = await db
        .update(mapGroups)
        .set({ name: body.name })
        .where(eq(mapGroups.id, groupId))
        .returning({ id: mapGroups.id });
      if (updated.length) {
        return status(200);
      }
      return status(404);
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
      await ensurePermissions(userId, groupId);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const upsertValues = body.locations.map((location) => ({
        ...location,
        extraPanoDate: location.extraPanoDate ?? null,
        mapGroupId: groupId,
        updatedAt: currentTimestamp,
        modifiedAt: currentTimestamp, // default value - not being set on conflict
      }));
      const usedTags = new Set(
        body.locations.map((location) => location.extraTag),
      );

      const BATCH_SIZE = 1000;
      try {
        await db.$primary.transaction(async (trx) => {
          // Step 1: Batched upsert operation
          for (let i = 0; i < upsertValues.length; i += BATCH_SIZE) {
            const batch = upsertValues.slice(i, i + BATCH_SIZE);

            await trx
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
              })
              .returning({ id: mapGroupLocations.id });
          }

          // Step 2: Delete records based on upload mode
          if (body.uploadMode === 'full') {
            // Full replacement: delete all locations not in current upload
            await trx
              .delete(mapGroupLocations)
              .where(
                and(
                  eq(mapGroupLocations.mapGroupId, groupId),
                  or(
                    isNull(mapGroupLocations.updatedAt),
                    lt(mapGroupLocations.updatedAt, currentTimestamp),
                  ),
                ),
              );
          } else if (body.uploadMode === 'tagReplace') {
            // Tag-based replacement: delete only locations with tags present in upload
            await trx
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
              );
          }
          // For 'partial' mode: no deletions, just upserts

          // Step 3: Insert tags into metas table
          if (usedTags.size > 0) {
            const metaInsertValues = Array.from(usedTags).map((tagName) => ({
              mapGroupId: groupId,
              tagName: tagName,
              name: '',
              note: '',
              modifiedAt: currentTimestamp,
            }));
            await trx
              .insert(metas)
              .values(metaInsertValues)
              .onConflictDoNothing();
          }
        });
      } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        if (
          [error, cause].some(
            (e) =>
              e instanceof Error &&
              e.message.includes(
                'ON CONFLICT DO UPDATE command cannot affect row a second time',
              ),
          )
        ) {
          return status(409, {
            message:
              'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.',
          });
        }
        throw error;
      }

      return { count: upsertValues.length };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        uploadMode: t.Union([
          t.Literal('partial'),
          t.Literal('full'),
          t.Literal('tagReplace'),
        ]),
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
      await ensurePermissions(userId, groupId);

      try {
        await uploadMetas(
          groupId,
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
      await ensurePermissions(userId, groupId);
      const group = await db.$primary.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!group) {
        return status(404);
      }
      await syncMapGroup(group);
      return;
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

      const coordinates = locations.map((location) => ({
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        pitch: location.pitch,
        zoom: location.zoom,
        panoId: location.panoId,
        countryCode: null,
        stateCode: null,
        extra: {
          tags: [location.extraTag],
          panoDate: location.extraPanoDate,
          panoId: location.extraPanoId,
        },
      }));

      const mapData = {
        name:
          body.metaIds && body.metaIds.length > 0
            ? `${group.name}_selected_metas`
            : group.name,
        customCoordinates: coordinates,
        extra: {
          tags: {},
          infoCoordinates: [],
        },
      };

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
      await ensurePermissions(userId, groupId);
      const updated = await db
        .update(mapGroups)
        // need to reset syncedAt
        .set({ ...body, syncedAt: null })
        .where(eq(mapGroups.id, groupId))
        .returning({ id: mapGroups.id });
      if (updated.length) {
        return status(200);
      }
      return status(404);
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ syncIncludeLocationsNotOnStreetView: t.Boolean() }),
      userId: true,
    },
  );
