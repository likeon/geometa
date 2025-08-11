import { locationMetas, mapGroups, metas } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const mapGroupsRouter = new Elysia({ prefix: '/map-groups' })
  .use(auth())
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
  );
