import {
  buildResponses,
  internalErrorResponse,
  notFoundResponse,
} from '@api/lib/api/response-schemas';
import { originalMapLateral } from '@api/lib/db/original-map';
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
import { isPopularMap, popularMapMessage } from '@api/lib/internal/utils';
import { generateFooter } from '@api/lib/userscript/utils';
import { isUniqueViolation } from '@api/lib/utils/common';
import { Type } from '@sinclair/typebox';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
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
            sql<number>`COUNT(DISTINCT ${syncedMapMetas.syncedMetaId})`
              .mapWith(Number)
              .as('syncedMetasCount'),
          locationsCount: sql<number>`COUNT(${syncedLocations.panoId})`
            .mapWith(Number)
            .as('syncedLocationsCount'),
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
      response: buildResponses({
        200: t.Array(
          t.Object({
            id: Type.Integer(),
            name: t.String(),
            geoguessrId: t.String(),
            metasCount: Type.Integer(),
            locationsCount: Type.Integer(),
          }),
        ),
      }),
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
        return status(500, internalErrorResponse);
      }
      if (!user.isSuperadmin && (await isPopularMap(geoguessrId))) {
        return status(403, { message: popularMapMessage });
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
        if (isUniqueViolation(e, 'maps_geoguessr_id_unique')) {
          return status(409, {
            message: 'Map with this GeoGuessr ID already exists.',
          });
        }
        throw e;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        geoguessrId: t.String({ minLength: 1 }),
      }),
      userId: true,
      response: buildResponses(
        {
          200: t.Object({ id: Type.Integer() }),
          409: t.Object({ message: t.String() }),
        },
        { forbidden: true, validation: true },
      ),
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
        return status(404, notFoundResponse);
      }

      const originalMap = originalMapLateral();

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
                                      )`.mapWith(Number),
          usedInMapName: originalMap.name,
          usedInMapAuthors: originalMap.authors,
          usedInMapGeoguessrId: originalMap.geoguessrId,
          usedInMapFooter:
            sql<string>`coalesce(${originalMap.footerHtml}, '')`.as(
              'usedInMapFooter',
            ),
        })
        .from(syncedMapMetas)
        .innerJoin(
          syncedMetas,
          eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
        )
        .leftJoinLateral(originalMap, sql`true`)
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
      response: buildResponses(
        {
          200: t.Object({
            geoguessrId: t.String(),
            name: t.String(),
            metas: t.Array(
              t.Object({
                metaId: Type.Integer(),
                name: t.String(),
                note: t.String(),
                footer: t.String(),
                images: t.Array(t.String()),
                noteFromPlonkit: t.Boolean(),
                countries: t.Array(t.String()),
                locationsCount: Type.Integer(),
                usedInMapName: t.Union([t.String(), t.Null()]),
                usedInMapAuthors: t.Union([t.String(), t.Null()]),
                usedInMapGeoguessrId: t.Union([t.String(), t.Null()]),
                usedInMapFooter: t.String(),
                generatedFooter: t.String(),
              }),
            ),
          }),
        },
        { forbidden: true, notFound: true, validation: true },
      ),
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
        return status(500, internalErrorResponse);
      }
      if (
        !user.isSuperadmin &&
        geoguessrId &&
        (await isPopularMap(geoguessrId))
      ) {
        return status(403, { message: popularMapMessage });
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
          return status(404, notFoundResponse);
        }

        return { id: result[0].id };
      } catch (e) {
        if (isUniqueViolation(e, 'maps_geoguessr_id_unique')) {
          return status(409, {
            message: 'Map with this GeoGuessr ID already exists.',
          });
        }
        throw e;
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
      response: buildResponses(
        {
          200: t.Object({ id: Type.Integer() }),
          409: t.Object({ message: t.String() }),
        },
        { forbidden: true, notFound: true, validation: true },
      ),
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
      response: buildResponses(
        { 200: t.Void() },
        { forbidden: true, validation: true },
      ),
    },
  )
  .post(
    '/:id/metas',
    async ({ params, body, userId, status }) => {
      const mapId = params.id;
      await ensureMapAccess(userId, mapId);
      const { metaIds } = body;

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
        return status(400, { message: 'No valid metaIds provided' });
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
      response: buildResponses(
        {
          200: t.Object({
            success: t.Literal(true),
            inserted: Type.Integer(),
          }),
          400: t.Object({ message: t.String() }),
        },
        { forbidden: true, validation: true },
      ),
    },
  )
  .delete(
    '/:id/metas',
    async ({ params, body, userId }) => {
      const mapId = params.id;
      await ensureMapAccess(userId, mapId);
      const { metaIds } = body;

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
      response: buildResponses(
        { 200: t.Void() },
        { forbidden: true, validation: true },
      ),
    },
  );
