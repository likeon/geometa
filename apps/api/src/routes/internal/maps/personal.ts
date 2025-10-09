import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensureMapAccess } from '@api/lib/internal/permissions';
import { geoguessrGetMapInfo } from '@api/lib/internal/utils';
import { generateFooter } from '@api/lib/userscript/utils';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Elysia, t } from 'elysia';
import { pick } from 'remeda';

export const personalMapsRouter = new Elysia({ prefix: '/personal' })
  .use(auth())
  .get(
    '',
    async ({ userId }) => {
      return db
        .select({
          id: maps.id,
          name: maps.name,
          geoguessrId: maps.geoguessrId,
          metasCount:
            sql<number>`COUNT(DISTINCT ${syncedMapMetas.syncedMetaId})`.as(
              'syncedMetasCount',
            ),
          locationsCount: sql<number>`COUNT(${syncedLocations.panoId})`.as(
            'syncedLocationsCount',
          ),
        })
        .from(maps)
        .leftJoin(syncedMapMetas, eq(syncedMapMetas.mapId, maps.id))
        .leftJoin(
          syncedLocations,
          eq(syncedLocations.syncedMetaId, syncedMapMetas.syncedMetaId),
        )
        .where(and(eq(maps.userId, userId), eq(maps.isPersonal, true)))
        .groupBy(maps.id, maps.name, maps.geoguessrId);
    },
    {
      userId: true,
      response: {
        200: t.Array(
          t.Object(
            {
              id: t.Integer(),
              name: t.String(),
              geoguessrId: t.String(),
              metasCount: t.Integer(),
              locationsCount: t.Integer(),
            },
            { description: 'PersonalMap object' },
          ),
          { description: 'Array of personal maps' },
        ),
      },
    },
  )
  .post(
    '',
    async ({ userId, body, status }) => {
      const { name, geoguessrId } = body;
      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        return status(500);
      }
      if (!user.isSuperadmin) {
        const mapInfo = await geoguessrGetMapInfo(geoguessrId);
        if (mapInfo && mapInfo.numberOfGamesPlayed > 10000) {
          return status(
            403,
            'This is a popular map which requires additional verification - ask for it in #map-making Discord channel',
          );
        }
      }

      try {
        const result = await db
          .insert(maps)
          .values({
            name,
            geoguessrId,
            userId,
            isPersonal: true,
          })
          .returning({ id: maps.id });

        return { id: result[0].id };
      } catch (e) {
        if (
          e instanceof Error &&
          'message' in e &&
          e.message.includes('unique constraint')
        ) {
          return status(409, 'Map with this GeoGuessr ID already exists.');
        }
        return status(500, 'Internal Server Error');
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        geoguessrId: t.String({ minLength: 1 }),
      }),
      userId: true,
    },
  )
  .get(
    '/:id',
    async ({ params: { id: mapId }, userId, status }) => {
      await ensureMapAccess(userId, mapId);

      // Fetch map details
      const map = await db.$primary.query.maps.findFirst({
        columns: {
          geoguessrId: true,
          name: true,
        },
        where: and(eq(maps.id, mapId), eq(maps.isPersonal, true)),
      });

      if (!map) {
        return status(404, 'Map not found');
      }

      const originalSyncedMapMetas = alias(syncedMapMetas, 'osmm');
      const originalMaps = alias(maps, 'om');

      const metas = await db
        .select({
          metaId: syncedMetas.metaId,
          ...pick(getTableColumns(syncedMetas), [
            'name',
            'note',
            'footer',
            'images',
            'noteFromPlonkit',
          ]),
          countries: sql<string[]>`
            ARRAY(
            SELECT DISTINCT ${syncedLocations.country}
            FROM ${syncedLocations}
            WHERE ${syncedLocations.syncedMetaId} = ${syncedMetas.metaId}
              AND ${syncedLocations.country} IS NOT NULL
              )
          `,
          locationsCount: sql<number>`(
                                        SELECT COUNT(*)
                                        FROM ${syncedLocations} sl
                                        WHERE sl.synced_meta_id = ${syncedMetas.metaId}
                                      )`,
          usedInMapName: originalMaps.name,
          usedInMapAuthors: originalMaps.authors,
          usedInMapGeoguessrId: originalMaps.geoguessrId,
          usedInMapFooter:
            sql<string>`coalesce(${originalMaps.footerHtml}, '')`.as(
              'usedInMapFooter',
            ),
        })
        .from(syncedMapMetas)
        .innerJoin(
          syncedMetas,
          eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
        )
        .leftJoin(
          originalSyncedMapMetas,
          and(
            eq(
              originalSyncedMapMetas.syncedMetaId,
              syncedMapMetas.syncedMetaId,
            ),
            sql`${originalSyncedMapMetas.mapId} = (
              SELECT smm2.map_id
              FROM ${syncedMapMetas} smm2
              INNER JOIN ${maps} m2 ON m2.id = smm2.map_id
              WHERE smm2.synced_meta_id = ${syncedMapMetas.syncedMetaId}
                AND m2.is_personal = FALSE
              ORDER BY m2.number_of_games_played DESC NULLS LAST
              LIMIT 1
            )`,
          ),
        )
        .leftJoin(
          originalMaps,
          eq(originalMaps.id, originalSyncedMapMetas.mapId),
        )
        .where(eq(syncedMapMetas.mapId, mapId));

      // Generate footer for each meta (same logic as userscript endpoint)
      const metasWithFooter = metas.map((meta) => {
        const country = meta.countries?.[0] || '';
        const footer = generateFooter(
          meta.noteFromPlonkit,
          country,
          meta.footer,
          meta.usedInMapFooter || '',
        );

        return {
          ...meta,
          generatedFooter: footer,
        };
      });

      return {
        geoguessrId: map.geoguessrId,
        name: map.name,
        metas: metasWithFooter,
      };
    },
    {
      userId: true,
      params: t.Object({ id: t.Integer() }),
    },
  )
  .patch(
    '/:id',
    async ({ params: { id: mapId }, body, userId, status }) => {
      await ensureMapAccess(userId, mapId);
      const { name, geoguessrId } = body;

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        return status(500);
      }
      if (!user.isSuperadmin && geoguessrId) {
        const mapInfo = await geoguessrGetMapInfo(geoguessrId);
        if (mapInfo && mapInfo.numberOfGamesPlayed > 10000) {
          return status(
            403,
            'This is a popular map which requires additional verification - ask for it in #map-making Discord channel',
          );
        }
      }

      try {
        const result = await db
          .update(maps)
          .set({
            name,
            geoguessrId,
          })
          .where(
            and(
              eq(maps.id, mapId),
              eq(maps.userId, userId),
              eq(maps.isPersonal, true),
            ),
          )
          .returning({ id: maps.id });

        if (result.length === 0) {
          return status(404, 'Map not found');
        }

        return { id: result[0].id };
      } catch (e) {
        if (
          e instanceof Error &&
          'message' in e &&
          e.message.includes('unique constraint')
        ) {
          return status(409, 'Map with this GeoGuessr ID already exists.');
        }
        return status(500, 'Internal Server Error');
      }
    },
    {
      params: t.Object({
        id: t.Integer(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        geoguessrId: t.Optional(t.String({ minLength: 1 })),
      }),
      userId: true,
    },
  )
  .delete(
    '/:id',
    async ({ params: { id: mapId }, userId }) => {
      await ensureMapAccess(userId, mapId);
      await db.delete(maps).where(eq(maps.id, mapId));
      return;
    },
    {
      params: t.Object({
        id: t.Integer(),
      }),
      userId: true,
    },
  )
  .post(
    '/:id/metas',
    async ({ params, body, userId, status }) => {
      const mapId = params.id;
      await ensureMapAccess(userId, mapId);
      const { metaIds } = body;

      if (
        !Array.isArray(metaIds) ||
        metaIds.some((id) => typeof id !== 'number')
      ) {
        return status(400, 'Invalid metaIds array');
      }

      // check if provided metaids are for sure from the map that has sharing enabled(not sure if needed but someone technically could send request with ids that are from not shared map?)
      const validMetaIds = await db
        .selectDistinct({ syncedMetaId: syncedMapMetas.syncedMetaId })
        .from(syncedMapMetas)
        .innerJoin(maps, eq(maps.id, syncedMapMetas.mapId))
        .where(
          and(
            eq(maps.isShared, true),
            inArray(syncedMapMetas.syncedMetaId, metaIds),
          ),
        );

      const validIdsSet = new Set(validMetaIds.map((m) => m.syncedMetaId));
      if (validIdsSet.size === 0) {
        return status(400, 'No valid metaIds provided');
      }

      const valuesToInsert = Array.from(validIdsSet).map((syncedMetaId) => ({
        mapId,
        syncedMetaId,
      }));

      await db
        .insert(syncedMapMetas)
        .values(valuesToInsert)
        .onConflictDoNothing(); // avoid duplicate errors

      return { success: true, inserted: valuesToInsert.length };
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Array(t.Integer()),
      }),
      userId: true,
    },
  )
  .delete(
    '/:id/metas',
    async ({ params, body, userId, status }) => {
      const mapId = params.id;
      await ensureMapAccess(userId, mapId);
      const { metaIds } = body;

      if (
        !Array.isArray(metaIds) ||
        metaIds.some((id) => typeof id !== 'number')
      ) {
        return status(400, 'Invalid metaIds array');
      }

      await db
        .delete(syncedMapMetas)
        .where(
          and(
            eq(syncedMapMetas.mapId, mapId),
            inArray(syncedMapMetas.syncedMetaId, metaIds),
          ),
        );
    },
    {
      params: t.Object({ id: t.Integer() }),
      body: t.Object({
        metaIds: t.Array(t.Integer()),
      }),
      userId: true,
    },
  );
