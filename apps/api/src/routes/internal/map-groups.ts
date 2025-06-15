import {
  locationRequestLogs,
  mapGroupLocations,
  mapGroups,
  maps,
  metas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { and, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const mapGroupsRouter = new Elysia({ prefix: '/map-groups' })
  .use(auth())
  .post(
    '/:id/sync',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);
      const group = await db.query.mapGroups.findFirst({
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
  .get(
    '/:id/location-requests',
    async ({ params: { id: mapGroupId }, query, userId }) => {
      await ensurePermissions(userId, mapGroupId);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - query.days);

      const results = await db
        .select({
          syncedMetaId: locationRequestLogs.syncedMetaId,
          metaName: syncedMetas.name,
          metaTag: metas.tagName,
          day: sql<string>`DATE(${locationRequestLogs.timestamp})`.as('day'),
          // Cast COUNT() to int because PostgreSQL COUNT() returns bigint,
          // which Drizzle serializes as string. ::int ensures JavaScript number.
          personalMapCount:
            sql<number>`(COUNT(*) FILTER (WHERE ${maps.isPersonal} = true))::int`.as(
              'personal_map_count',
            ),
          regularMapCount:
            sql<number>`(COUNT(*) FILTER (WHERE ${maps.isPersonal} = false))::int`.as(
              'regular_map_count',
            ),
        })
        .from(locationRequestLogs)
        .innerJoin(maps, eq(maps.id, locationRequestLogs.mapId))
        .innerJoin(
          syncedMetas,
          eq(syncedMetas.metaId, locationRequestLogs.syncedMetaId),
        )
        .innerJoin(metas, eq(metas.id, syncedMetas.metaId))
        .where(
          and(
            eq(syncedMetas.mapGroupId, mapGroupId),
            gte(locationRequestLogs.timestamp, daysAgo),
            isNotNull(locationRequestLogs.syncedMetaId),
          ),
        )
        .groupBy(
          locationRequestLogs.syncedMetaId,
          syncedMetas.name,
          metas.tagName,
          sql`DATE(${locationRequestLogs.timestamp})`,
        )
        .orderBy(
          locationRequestLogs.syncedMetaId,
          sql`DATE(${locationRequestLogs.timestamp})`,
        );
      // Group by meta ID using Map for O(1) lookups
      const metaMap = new Map<
        number,
        {
          metaId: number;
          metaName: string;
          metaTag: string;
          totalCount: number;
          data: Array<{
            day: string;
            personalMapCount: number;
            regularMapCount: number;
          }>;
        }
      >();

      for (const row of results) {
        const metaId = Number(row.syncedMetaId);
        let meta = metaMap.get(metaId);

        if (!meta) {
          meta = {
            metaId: metaId,
            metaName: row.metaName,
            metaTag: row.metaTag,
            totalCount: 0,
            data: [],
          };
          metaMap.set(metaId, meta);
        }

        const dayTotal = row.personalMapCount + row.regularMapCount;
        meta.totalCount += dayTotal;

        meta.data.push({
          day: row.day,
          personalMapCount: row.personalMapCount,
          regularMapCount: row.regularMapCount,
        });
      }

      return Array.from(metaMap.values());
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      query: t.Object({
        days: t.Number({ minimum: 30, maximum: 365, default: 30 }),
      }),
      userId: true,
    },
  )
  .post(
    '/:id/download-locations',
    async ({ params: { id: groupId }, body, userId, set }) => {
      await ensurePermissions(userId, groupId);
      
      const group = await db.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      
      if (!group) {
        set.status = 404;
        return { error: 'Map group not found' };
      }

      // If no meta IDs provided, return all locations for the group
      let whereClause;
      if (body.metaIds && body.metaIds.length > 0) {
        whereClause = and(
          eq(mapGroupLocations.mapGroupId, groupId),
          inArray(mapGroupLocations.extraTag, body.metaIds)
        );
      } else {
        whereClause = eq(mapGroupLocations.mapGroupId, groupId);
      }

      const locations = await db
        .select()
        .from(mapGroupLocations)
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
        name: body.metaIds && body.metaIds.length > 0 
          ? `${group.name}_selected_metas` 
          : group.name,
        customCoordinates: coordinates,
        extra: {
          tags: {},
          infoCoordinates: [],
        },
      };

      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] = `attachment; filename="${mapData.name}.json"`;
      
      return mapData;
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Optional(t.Array(t.String())),
      }),
      userId: true,
      response: {
        200: t.Object({
          name: t.String(),
          customCoordinates: t.Array(t.Object({
            lat: t.Number(),
            lng: t.Number(),
            heading: t.Number(),
            pitch: t.Number(),
            zoom: t.Number(),
            panoId: t.String(),
            countryCode: t.Union([t.String(), t.Null()]),
            stateCode: t.Union([t.String(), t.Null()]),
            extra: t.Object({
              tags: t.Array(t.String()),
              panoDate: t.Union([t.String(), t.Null()]),
              panoId: t.Union([t.String(), t.Null()]),
            }),
          })),
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
      
      const group = await db.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      
      if (!group) {
        set.status = 404;
        return { error: 'Map group not found' };
      }

      // If no meta IDs provided, return all metas for the group
      let whereClause;
      if (body.metaIds && body.metaIds.length > 0) {
        whereClause = and(
          eq(metas.mapGroupId, groupId),
          inArray(metas.tagName, body.metaIds)
        );
      } else {
        whereClause = eq(metas.mapGroupId, groupId);
      }

      const selectedMetas = await db.query.metas.findMany({
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

      const fileName = body.metaIds && body.metaIds.length > 0 
        ? `${group.name}_selected_metas` 
        : `${group.name}_metas`;

      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] = `attachment; filename="${fileName}.json"`;
      
      return {
        name: fileName,
        metas: result
      };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Optional(t.Array(t.String())),
      }),
      userId: true,
      response: {
        200: t.Object({
          name: t.String(),
          metas: t.Array(t.Object({
            tagName: t.String(),
            metaName: t.String(),
            note: t.String(),
            footer: t.String(),
            levels: t.Array(t.String()),
            images: t.Array(t.String()),
          })),
        }),
        404: t.Object({ error: t.String() }),
      },
    },
  );
