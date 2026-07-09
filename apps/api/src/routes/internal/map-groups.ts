import {
  locationMetas,
  mapGroupLocations,
  mapGroupPermissions,
  mapGroups,
  maps,
  metas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
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
      const id = await db.$primary.transaction(async (tx) => {
        const inserted = await tx
          .insert(mapGroups)
          .values({ name: body.name })
          .returning({ id: mapGroups.id });
        await tx
          .insert(mapGroupPermissions)
          .values({ mapGroupId: inserted[0].id, userId });
        return inserted[0].id;
      });
      return { id };
    },
    {
      body: t.Object({ name: t.String({ minLength: 1 }) }),
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
