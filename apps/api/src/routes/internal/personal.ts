import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensureMapAccess } from '@api/lib/internal/permissions';
import { and, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const personalMapsRouter = new Elysia({ prefix: 'maps/personal' })
  .use(auth())
  .get(
    '/',
    async ({ userId }) => {
      const personalMaps = await db
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

      return personalMaps;
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
    '/',
    async ({ userId, body, set }) => {
      const { name, geoguessrId } = body;
      // TODO: add checking if geoguessrID is popular map and if its valid
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
          set.status = 409;
          return { error: 'Map with this GeoGuessr ID already exists.' };
        }
        set.status = 500;
        return { error: 'Internal Server Error' };
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
    async ({ params: { id: mapId }, userId, set }) => {
      await ensureMapAccess(userId, mapId);

      // Fetch map details
      const map = await db.query.maps.findFirst({
        columns: {
          geoguessrId: true,
          name: true,
        },
        where: and(
          eq(maps.id, mapId),
          eq(maps.userId, userId),
          eq(maps.isPersonal, true),
        ),
      });

      if (!map) {
        set.status = 404;
        return { error: 'Map not found' };
      }

      // Fetch associated metas
      const metas = await db
        .select({
          metaId: syncedMetas.metaId,
          name: syncedMetas.name,
          locationsCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${syncedLocations} sl
          WHERE sl.synced_meta_id = ${syncedMetas.metaId}
        )`,
          usedInMapName: sql<string | null>`(
          SELECT m.name
          FROM ${syncedMapMetas} sm
          INNER JOIN ${maps} m ON m.id = sm.map_id
          WHERE
            sm.synced_meta_id = ${syncedMetas.metaId}
            AND m.is_personal = FALSE
          ORDER BY m.number_of_games_played DESC NULLS LAST, m.id ASC
          LIMIT 1
        )`,
        })
        .from(syncedMapMetas)
        .innerJoin(
          syncedMetas,
          eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
        )
        .where(eq(syncedMapMetas.mapId, mapId));

      return {
        geoguessrId: map.geoguessrId,
        name: map.name,
        metas,
      };
    },
    {
      userId: true,
      params: t.Object({ id: t.Integer() }),
      response: {
        200: t.Object({
          geoguessrId: t.String(),
          name: t.String(),
          metas: t.Array(
            t.Object({
              metaId: t.Integer(),
              name: t.String(),
              locationsCount: t.Integer(),
              usedInMapName: t.Nullable(t.String()),
            }),
          ),
        }),
        404: t.Object({
          error: t.String(),
        }),
      },
    },
  )
  .patch(
    '/:id',
    async ({ params: { id: mapId }, body, userId, set }) => {
      await ensureMapAccess(userId, mapId);
      console.log(body);
      const { name, geoguessrId } = body;

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
          set.status = 404;
          return { error: 'Map not found' };
        }

        return { id: result[0].id };
      } catch (e) {
        if (
          e instanceof Error &&
          'message' in e &&
          e.message.includes('unique constraint')
        ) {
          set.status = 409;
          return { error: 'Map with this GeoGuessr ID already exists.' };
        }

        set.status = 500;
        return { error: 'Internal Server Error' };
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
  );
