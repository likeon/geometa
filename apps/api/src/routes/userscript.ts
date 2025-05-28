import { mapGroupPermissions, maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import {
  legacyLocationSelect,
  locationSelect,
  mapLocationsExportSelect,
} from '@api/lib/userscript/locations';
import { generateFooter } from '@api/lib/userscript/utils';
import { eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.82';

const mapInfoQuery = db.query.maps
  .findFirst({
    where: eq(maps.geoguessrId, sql.placeholder('geoguessrId')),
    columns: {
      isPersonal: true,
    },
  })
  .prepare('userscript_get_map_info');

export const userscriptRouter = new Elysia({
  prefix: '/userscript',
  detail: { tags: ['userscript'] },
})
  // .use(bearer())
  .get('/map/:geoguessrId', async ({ params: { geoguessrId }, status }) => {
    const map = await mapInfoQuery.execute({ geoguessrId });
    if (!map) {
      return status(404, {
        mapFound: false,
        userscriptVersion: userscriptVersion,
      });
    }

    return {
      mapFound: true,
      isPersonal: map.isPersonal,
      userscriptVersion: userscriptVersion,
    };
  })
  .get(
    '/announcement/',
    async ({}) => {
      return {
            };
      // example announcement
      // return {
      //   timestamp: 1748360716,
      //   htmlMessage: `🎉 Check out our <a href='#' target='_blank'>new features</a> page for exciting updates. This is a test message!`
      // };
    },
    {
    },
  )
  .get(
    '/location/',
    async ({ query, set }) => {
      const cacheKey = `${query.mapId}:${query.panoId}`;
      const [metaResult, legacyCacheResult] = await Promise.all([
        locationSelect.execute(query),
        legacyLocationSelect.execute({ key: cacheKey }),
      ]);
      if (!metaResult.length && !legacyCacheResult.length) {
        set.status = 404;
        return ['NOT_FOUND'];
      }

      set.status = 200;
      // fallback to legacy
      if (!metaResult.length) {
        return JSON.parse(legacyCacheResult[0].value);
      }

      const [meta] = metaResult;
      // hack for now, should country be marked as not null in schema since we will always have it?
      const country = meta.country || '';

      const footer = generateFooter(
        meta.noteFromPlonkit,
        country,
        meta.footer,
        meta.mapFooter,
      );

      return {
        country: country,
        metaName: meta.name,
        note: meta.note,
        images: meta.images,
        footer: footer,
      };
    },
    {
      query: t.Object({
        mapId: t.String(),
        panoId: t.String(),
      }),
    },
  )
  // todo: move elsewhere after personal maps merged
  .derive(({ headers }) => {
    const auth = headers.authorization;

    return {
      bearer: auth?.startsWith('Bearer ') ? auth.slice(7) : null,
    };
  })
  .get(
    '/map/:geoguessrId/locations',
    async ({ params: { geoguessrId }, status, bearer }) => {
      if (!bearer) {
        return status(401);
      }

      const results = await db
        .select({
          mapId: maps.id,
          userApiTokens: sql<string[]>`
            CASE
      WHEN ${maps.isPersonal} = TRUE THEN
            COALESCE(
            (SELECT ARRAY_AGG(${users.apiToken})
            FILTER (WHERE ${users.id} = ${maps.userId})
            FROM ${users} WHERE ${users.id} = ${maps.userId}),'{}'::text[]
            )
            ELSE
            COALESCE(
            (
            SELECT ARRAY_AGG(${users.apiToken})
            FILTER (WHERE ${users.apiToken} IS NOT NULL)
            FROM ${mapGroupPermissions}
            JOIN ${users} ON ${users.id} = ${mapGroupPermissions.userId}
            WHERE ${mapGroupPermissions.mapGroupId} = ${maps.mapGroupId}
            ),'{}'::text[]
            )
            END
          `.as('user_api_tokens'),
        })
        .from(maps)
        .leftJoin(users, eq(users.id, maps.userId))
        .where(eq(maps.geoguessrId, geoguessrId));

      const [data] = results;
      if (
        data.userApiTokens.length === 0 ||
        !data.userApiTokens.includes(bearer)
      ) {
        return status(403);
      }
      const locations = await mapLocationsExportSelect.execute({
        mapId: data.mapId,
      });
      return {
        customCoordinates: locations.map((location) => ({
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          pitch: location.pitch,
          zoom: location.zoom,
          panoId: location.panoId,
          countryCode: null,
          stateCode: null,
        })),
      };
    },
  );
