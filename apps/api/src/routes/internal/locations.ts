import { mapGroupLocations } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { and, count, eq, isNull } from 'drizzle-orm';
import { Elysia, type Static, t } from 'elysia';
import { pick } from 'remeda';

const querySchema = t.Object({
  groupId: t.Integer(),
  isOnStreetView: t.Optional(t.Union([t.Boolean(), t.Null()])),
});
export type QuerySchema = Static<typeof querySchema>;

const buildWhere = (query: QuerySchema) => {
  const conditions = [eq(mapGroupLocations.mapGroupId, query.groupId)];

  if (query.isOnStreetView !== undefined) {
    conditions.push(
      query.isOnStreetView === null
        ? isNull(mapGroupLocations.isOnStreetView)
        : eq(mapGroupLocations.isOnStreetView, query.isOnStreetView),
    );
  }

  return and(...conditions);
};

export const locationsRouter = new Elysia({ prefix: '/locations' })
  .use(auth())
  .get(
    '',
    async ({ query, userId }) => {
      await ensurePermissions(userId, query.groupId);

      const locations = await db
        .select(
          pick(mapGroupLocations, [
            'lat',
            'lng',
            'heading',
            'pitch',
            'zoom',
            'panoId',
            'extraTag',
            'extraPanoId',
            'extraPanoDate',
          ]),
        )
        .from(mapGroupLocations)
        .where(buildWhere(query));

      return locations.map((location) => ({
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        pitch: location.pitch,
        zoom: location.zoom,
        panoId: location.panoId,
        extra: {
          tag: location.extraTag,
          panoId: location.extraPanoId,
          panoDate: location.extraPanoDate,
        },
      }));
    },
    {
      query: querySchema,
      userId: true,
    },
  )
  .get(
    '/count',
    async ({ query, userId }) => {
      await ensurePermissions(userId, query.groupId);

      const result = await db
        .select({ count: count(mapGroupLocations.id) })
        .from(mapGroupLocations)
        .where(buildWhere(query));

      return { count: result[0].count };
    },
    {
      query: querySchema,
      userId: true,
    },
  );
