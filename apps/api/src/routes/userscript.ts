import { mapGroupPermissions, maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import {
  locationSelect,
  mapLocationsExportSelect,
} from '@api/lib/userscript/locations';
import { generateFooter } from '@api/lib/userscript/utils';
import { eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.88';

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
  .get('/announcement/', async () => {
    return;
  })
  .get(
    '/location/',
    async ({ query, set }) => {
      const metaResult = await locationSelect.execute(query);
      if (!metaResult.length) {
        set.status = 404;
        return ['NOT_FOUND'];
      }

      // shouldn't really be needed, but we hit a bug in prod where each api endpoint returns 404 with correct response data
      // seems to be fixed now, but userscript relies on response status of this api
      // just keep to be safe
      set.status = 200;

      const [meta] = metaResult;
      // hack for now, should country be marked as not null in schema since we will always have it?
      const country = meta.country || '';

      // Log the location request in the background
      // setImmediate(async () => {
      //   try {
      //     await db.insert(locationRequestLogs).values({
      //       mapId: meta.mapId,
      //       panoId: query.panoId,
      //       syncedMetaId: meta.syncedMetaId,
      //     });
      //   } catch (error) {
      //     // Don't fail the request if logging fails
      //     console.error('Failed to log location request:', error);
      //   }
      // });

      let footer = generateFooter(
        meta.noteFromPlonkit,
        country,
        meta.footer,
        meta.mapFooter,
      );
      if (meta.isPersonalMap && meta.mapAuthors && meta.mapName) {
        footer += `<p>Meta taken from <a href="https://learnablemeta.com/maps/${meta.mapGeoguessrId}" rel ="nofollow" target="_blank"> ${meta.mapName} </a> by <b>${meta.mapAuthors}</b></p>`;
      }
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
