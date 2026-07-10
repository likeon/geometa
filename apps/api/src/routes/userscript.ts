import { mapGroupPermissions, maps, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { bearer } from '@api/lib/internal/auth';
import {
  locationSelect,
  mapLocationsExportSelect,
} from '@api/lib/userscript/locations';
import { generateFooter } from '@api/lib/userscript/utils';
import { eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.89';

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
  .use(bearer())
  .get(
    '/map/:geoguessrId/locations',
    async ({ params: { geoguessrId }, status, bearer }) => {
      if (!bearer) {
        return status(401);
      }

      // authorized = the token belongs to the personal map's owner, or to a
      // user with permissions on the map's group
      const [data] = await db
        .select({
          mapId: maps.id,
          authorized: sql<boolean>`
            EXISTS (
              SELECT 1
              FROM ${users} u
              WHERE u.api_token = ${bearer}
                AND CASE
                  WHEN ${maps.isPersonal} THEN u.id = ${maps.userId}
                  ELSE EXISTS (
                    SELECT 1
                    FROM ${mapGroupPermissions} mgp
                    WHERE mgp.map_group_id = ${maps.mapGroupId}
                      AND mgp.user_id = u.id
                  )
                END
            )
          `,
        })
        .from(maps)
        .where(eq(maps.geoguessrId, geoguessrId));

      if (!data) {
        return status(404);
      }
      if (!data.authorized) {
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
