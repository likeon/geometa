import { maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import {
  legacyLocationSelect,
  locationSelect,
  personalMapLocationsExportSelect,
} from '@api/lib/userscript/locations';
import { generateFooter } from '@api/lib/userscript/utils';
import bearer from '@elysiajs/bearer';
import { and, eq, sql } from 'drizzle-orm';
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
  // .get(
  //   '/map/:geoguessrId/locations',
  //   async ({ params: { geoguessrId }, bearer, status }) => {
  //     if (!bearer) {
  //       return status(401);
  //     }
  //     const mapResult = await db
  //       .select({
  //         id: maps.id,
  //         mapGroupId: maps.mapGroupId,
  //         userApiToken: users.apiToken,
  //         isPersonal: maps.isPersonal,
  //       })
  //       .from(maps)
  //       .leftJoin(users, eq(users.id, maps.userId))
  //       .where(and(eq(maps.geoguessrId, geoguessrId)));
  //     if (!mapResult.length) {
  //       return status(404);
  //     }
  //
  //     const [map] = mapResult;
  //
  //     // authenticate and get locations differently depending on what kind of map it is
  //     if (!map.isPersonal) {
  //       // not implemented yet
  //       return status(501);
  //     }
  //
  //     if (!map.userApiToken || bearer !== map.userApiToken) {
  //       return status(403);
  //     }
  //
  //     const locations = await personalMapLocationsExportSelect.execute({
  //       mapId: map.id,
  //     });
  //     return {
  //       customCoordinates: locations.map((location) => ({
  //         lat: location.lat,
  //         lng: location.lng,
  //         heading: location.heading,
  //         pitch: location.pitch,
  //         zoom: location.zoom,
  //         panoId: location.panoId,
  //         countryCode: null,
  //         stateCode: null,
  //         extra: {
  //           panoDate: location.extraPanoDate,
  //           panoId: location.extraPanoId,
  //         },
  //       })),
  //     };
  //   },
  // )
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
  );
