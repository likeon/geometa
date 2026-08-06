import {
  levels,
  mapFilters,
  mapLevels,
  mapLocations,
  mapRegions,
  maps,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { logChange } from '@api/lib/internal/changes';
import { ensureOwner, ensurePermissions } from '@api/lib/internal/permissions';
import {
  geoguessrMapJson,
  isPopularMap,
  popularMapMessage,
} from '@api/lib/internal/utils';
import { isUniqueViolation } from '@api/lib/utils/common';
import { markdown2Html } from '@api/lib/utils/markdown';
import { and, eq, inArray, not } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const groupMapsRouter = new Elysia({ prefix: '/group' })
  .use(auth())
  .put(
    '/',
    async ({ body, userId, status }) => {
      await ensureOwner(userId, body.mapGroupId);

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

      const [groupLevels, allRegions] = await Promise.all([
        db.$primary.query.levels.findMany({
          where: eq(levels.mapGroupId, dataNoId.mapGroupId),
          columns: { id: true, name: true },
        }),
        db.$primary.query.regions.findMany({
          columns: { id: true, name: true },
        }),
      ]);
      const levelNameById = new Map(
        groupLevels.map((level) => [level.id, level.name]),
      );
      const levelNames = (ids: number[]) =>
        ids
          .map((levelId) => levelNameById.get(levelId) ?? `#${levelId}`)
          .sort();
      const regionNameById = new Map(
        allRegions.map((region) => [region.id, region.name]),
      );
      const regionNames = (ids: number[]) =>
        ids
          .map((regionId) => regionNameById.get(regionId) ?? `#${regionId}`)
          .sort();

      let geoguessrIdChanged: boolean;
      let savedData: typeof maps.$inferSelect | undefined;
      let oldMapDetails: Record<string, unknown> | null = null;
      if (id) {
        savedData = await db.$primary.query.maps.findFirst({
          where: eq(maps.id, id),
        });
        if (!savedData || savedData.mapGroupId === null) {
          return status(404);
        }
        // also require permission on the map's current group, not just the target
        await ensureOwner(userId, savedData.mapGroupId);
        geoguessrIdChanged = savedData.geoguessrId !== dataNoId.geoguessrId;

        const [oldLevels, oldFilters, oldRegions] = await Promise.all([
          db.$primary.query.mapLevels.findMany({
            where: eq(mapLevels.mapId, id),
          }),
          db.$primary.query.mapFilters.findMany({
            where: eq(mapFilters.mapId, id),
          }),
          db.$primary.query.mapRegions.findMany({
            where: eq(mapRegions.mapId, id),
          }),
        ]);
        if (savedData.mapGroupId !== dataNoId.mapGroupId) {
          // the old level assignments belong to the source group
          const sourceGroupLevels = await db.$primary.query.levels.findMany({
            where: eq(levels.mapGroupId, savedData.mapGroupId),
            columns: { id: true, name: true },
          });
          for (const level of sourceGroupLevels) {
            levelNameById.set(level.id, level.name);
          }
        }
        oldMapDetails = {
          mapGroupId: savedData.mapGroupId,
          name: savedData.name,
          geoguessrId: savedData.geoguessrId,
          description: savedData.description,
          isPublished: savedData.isPublished,
          isShared: savedData.isShared,
          authors: savedData.authors,
          footer: savedData.footer,
          difficulty: savedData.difficulty,
          ordering: savedData.ordering,
          isVerified: savedData.isVerified,
          regions: regionNames(oldRegions.map((mr) => mr.regionId)),
          levels: levelNames(oldLevels.map((ml) => ml.levelId)),
          includeFilters: oldFilters
            .filter((f) => !f.isExclude)
            .map((f) => f.tagLike)
            .sort(),
          excludeFilters: oldFilters
            .filter((f) => f.isExclude)
            .map((f) => f.tagLike)
            .sort(),
        };
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

          // log what was actually persisted: role-gated fields fall back to
          // the previous value (or the column default on create)
          const newMapDetails = {
            mapGroupId: dataNoId.mapGroupId,
            name: dataNoId.name,
            geoguessrId: dataNoId.geoguessrId,
            description: dataNoId.description,
            isPublished:
              user.isSuperadmin || user.isTrusted
                ? dataNoId.isPublished
                : (savedData?.isPublished ?? false),
            isShared: dataNoId.isShared,
            authors: dataNoId.authors,
            footer: dataNoId.footer,
            difficulty: dataNoId.difficulty,
            ordering: user.isSuperadmin
              ? dataNoId.ordering
              : (savedData?.ordering ?? 0),
            isVerified: user.isSuperadmin
              ? dataNoId.isVerified
              : (savedData?.isVerified ?? false),
            regions: regionNames(regionIds),
            levels: levelNames(levelIds),
            includeFilters: [...includeFilters].sort(),
            excludeFilters: [...excludeFilters].sort(),
          };
          if (savedData && savedData.mapGroupId !== dataNoId.mapGroupId) {
            // moved between groups: log the departure and the arrival
            await logChange(tx, [
              {
                mapGroupId: savedData.mapGroupId!,
                userId,
                entityType: 'map',
                entityId: mapId,
                entityLabel: savedData.name,
                operation: 'delete',
                oldValue: oldMapDetails,
                newValue: { movedToGroupId: dataNoId.mapGroupId },
              },
              {
                mapGroupId: dataNoId.mapGroupId,
                userId,
                entityType: 'map',
                entityId: mapId,
                entityLabel: dataNoId.name,
                operation: 'create',
                newValue: {
                  ...newMapDetails,
                  movedFromGroupId: savedData.mapGroupId,
                },
              },
            ]);
          } else {
            await logChange(tx, {
              mapGroupId: dataNoId.mapGroupId,
              userId,
              entityType: 'map',
              entityId: mapId,
              entityLabel: dataNoId.name,
              operation: id === undefined ? 'create' : 'update',
              oldValue: oldMapDetails,
              newValue: newMapDetails,
            });
          }

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
      await ensureOwner(userId, map.mapGroupId);

      await db.$primary.transaction(async (tx) => {
        await tx.delete(maps).where(eq(maps.id, mapId));
        await logChange(tx, {
          mapGroupId: map.mapGroupId!,
          userId,
          entityType: 'map',
          entityId: mapId,
          entityLabel: map.name,
          operation: 'delete',
          oldValue: {
            name: map.name,
            geoguessrId: map.geoguessrId,
            description: map.description,
            isPublished: map.isPublished,
          },
        });
      });
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

      // the group-map export intentionally leaves tags empty
      const mapData = geoguessrMapJson(
        map.name,
        locations.map((location) => ({ ...location, extraTag: undefined })),
      );

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
