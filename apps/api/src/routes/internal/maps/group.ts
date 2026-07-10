import {
  mapFilters,
  mapLevels,
  mapLocations,
  mapRegions,
  maps,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { isPopularMap, popularMapMessage } from '@api/lib/internal/utils';
import { isUniqueViolation } from '@api/lib/utils/common';
import { markdown2Html } from '@api/lib/utils/markdown';
import { and, eq, inArray, not } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const groupMapsRouter = new Elysia({ prefix: '/group' })
  .use(auth())
  .put(
    '/',
    async ({ body, userId, status }) => {
      await ensurePermissions(userId, body.mapGroupId);

      const {
        id,
        levels: levelIds,
        regions: regionIds,
        includeFilters,
        excludeFilters,
        ...dataNoId
      } = body;
      const combinedFilters = [
        ...includeFilters.map((filter) => ({ name: filter, isExclude: false })),
        ...excludeFilters.map((filter) => ({ name: filter, isExclude: true })),
      ];

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        return status(500);
      }

      let geoguessrIdChanged: boolean;
      if (id) {
        const savedData = await db.$primary.query.maps.findFirst({
          where: eq(maps.id, id),
        });
        if (!savedData || savedData.mapGroupId === null) {
          return status(404);
        }
        // also require permission on the map's current group, not just the target
        await ensurePermissions(userId, savedData.mapGroupId);
        geoguessrIdChanged = savedData.geoguessrId !== dataNoId.geoguessrId;
      } else {
        geoguessrIdChanged = true;
      }

      if (
        geoguessrIdChanged &&
        !user.isSuperadmin &&
        (await isPopularMap(dataNoId.geoguessrId))
      ) {
        return status(403, { message: popularMapMessage });
      }

      const footerHtml = await markdown2Html(dataNoId.footer || '');
      const baseValues = {
        mapGroupId: dataNoId.mapGroupId,
        name: dataNoId.name,
        geoguessrId: dataNoId.geoguessrId,
        description: dataNoId.description,
        isShared: dataNoId.isShared,
        authors: dataNoId.authors,
        footer: dataNoId.footer,
        difficulty: dataNoId.difficulty,
        modifiedAt: Math.floor(Date.now() / 1000),
        footerHtml,
      };

      const values = {
        ...baseValues,
        ...(user.isSuperadmin && {
          ordering: dataNoId.ordering,
          autoUpdate: dataNoId.autoUpdate,
          isVerified: dataNoId.isVerified,
        }),
        ...((user.isSuperadmin || user.isTrusted) && {
          isPublished: dataNoId.isPublished,
        }),
      };

      try {
        const mapId = await db.$primary.transaction(async (tx) => {
          let mapId: number;
          if (id === undefined) {
            const insertResult = await tx
              .insert(maps)
              .values(values)
              .returning({ insertedId: maps.id });
            mapId = insertResult[0].insertedId;
          } else {
            await tx.update(maps).set(values).where(eq(maps.id, id));
            mapId = id;
          }

          await tx
            .delete(mapLevels)
            .where(
              and(
                eq(mapLevels.mapId, mapId),
                not(inArray(mapLevels.levelId, levelIds)),
              ),
            );
          if (levelIds.length !== 0) {
            await tx
              .insert(mapLevels)
              .values(levelIds.map((levelId) => ({ levelId, mapId })))
              .onConflictDoNothing();
          }

          await tx.delete(mapFilters).where(
            and(
              eq(mapFilters.mapId, mapId),
              not(
                inArray(
                  mapFilters.tagLike,
                  combinedFilters.map((filter) => filter.name),
                ),
              ),
            ),
          );
          if (combinedFilters.length !== 0) {
            await tx
              .insert(mapFilters)
              .values(
                combinedFilters.map((filter) => ({
                  tagLike: filter.name,
                  mapId: mapId,
                  isExclude: filter.isExclude,
                })),
              )
              .onConflictDoNothing();
          }

          if (regionIds.length !== 0) {
            await tx
              .insert(mapRegions)
              .values(regionIds.map((regionId) => ({ mapId, regionId })))
              .onConflictDoNothing();
          }
          await tx
            .delete(mapRegions)
            .where(
              and(
                eq(mapRegions.mapId, mapId),
                not(inArray(mapRegions.regionId, regionIds)),
              ),
            );

          return mapId;
        });
        return { id: mapId };
      } catch (error) {
        if (isUniqueViolation(error, 'maps_geoguessr_id_unique')) {
          return status(409, {
            message:
              'This GeoGuessr ID is already used by another map. Please use a different ID.',
          });
        }
        throw error;
      }
    },
    {
      body: t.Object({
        id: t.Optional(t.Integer()),
        mapGroupId: t.Integer(),
        name: t.String({ minLength: 1 }),
        geoguessrId: t.String({ minLength: 1 }),
        description: t.Union([t.String(), t.Null()]),
        isPublished: t.Boolean(),
        isShared: t.Boolean(),
        authors: t.Union([t.String(), t.Null()]),
        ordering: t.Number(),
        autoUpdate: t.Boolean(),
        footer: t.String(),
        isVerified: t.Boolean(),
        includeFilters: t.Array(t.String()),
        excludeFilters: t.Array(t.String()),
        regions: t.Array(t.Integer()),
        levels: t.Array(t.Integer()),
        difficulty: t.Number(),
      }),
      userId: true,
    },
  )
  .delete(
    '/:id',
    async ({ params: { id: mapId }, userId, status }) => {
      const map = await db.$primary.query.maps.findFirst({
        where: eq(maps.id, mapId),
      });
      if (!map || map.mapGroupId === null) {
        return status(404);
      }
      await ensurePermissions(userId, map.mapGroupId);

      await db.delete(maps).where(eq(maps.id, mapId));
      return status(200);
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/download',
    async ({ params: { id: mapId }, query, userId, set, status }) => {
      const map = await db.$primary.query.maps.findFirst({
        where: and(eq(maps.id, mapId), eq(maps.mapGroupId, query.groupId)),
      });
      if (!map) {
        return status(404, { error: 'Map not found' });
      }
      await ensurePermissions(userId, query.groupId);

      const locations = await db
        .select()
        .from(mapLocations)
        .where(eq(mapLocations.mapId, mapId));

      const coordinates = locations.map((locationItem) => ({
        lat: locationItem.lat,
        lng: locationItem.lng,
        heading: locationItem.heading,
        pitch: locationItem.pitch,
        zoom: locationItem.zoom,
        panoId: locationItem.panoId,
        countryCode: null,
        stateCode: null,
        extra: {
          tags: [],
          panoDate: locationItem.extraPanoDate,
          panoId: locationItem.extraPanoId,
        },
      }));

      const mapData = {
        name: map.name,
        customCoordinates: coordinates,
        extra: {
          tags: {},
          infoCoordinates: [],
        },
      };

      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] =
        `attachment; filename="${map.name}.json"`;

      return mapData;
    },
    {
      params: t.Object({ id: t.Integer() }),
      query: t.Object({ groupId: t.Integer() }),
      userId: true,
    },
  );
