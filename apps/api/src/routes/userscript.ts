import {
  buildResponses,
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@api/lib/api/response-schemas';
import {
  mapGroupPermissions,
  mapGroups,
  maps,
  syncedLocations,
  syncedMapMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { bearer } from '@api/lib/internal/auth';
import { locationSelect } from '@api/lib/userscript/locations';
import { fingerprintMapCoordinates } from '@api/lib/userscript/map-fingerprint';
import { getSynchronizedGroupMapSnapshots } from '@api/lib/userscript/map-snapshots';
import { generateFooter } from '@api/lib/userscript/utils';
import { Type } from '@sinclair/typebox';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.94';
const tokenSecurity = [{ learnableMetaToken: [] as string[] }];

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
  .get(
    '/map/:geoguessrId',
    async ({ params: { geoguessrId }, status }) => {
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
    },
    {
      params: t.Object({ geoguessrId: t.String() }),
      response: buildResponses(
        {
          200: t.Object({
            mapFound: t.Literal(true),
            isPersonal: t.Boolean(),
            userscriptVersion: t.String(),
          }),
          404: t.Object({
            mapFound: t.Literal(false),
            userscriptVersion: t.String(),
          }),
        },
        { public: true, validation: true },
      ),
      detail: {
        tags: ['Userscript'],
        operationId: 'getMapCompatibility',
        summary: 'Check map',
        description:
          'Checks whether Learnable Meta supports a GeoGuessr map and returns the userscript data version.',
      },
    },
  )
  .get(
    '/announcement/',
    async () => {
      return;
    },
    {
      response: buildResponses({ 200: t.Void() }, { public: true }),
      detail: {
        tags: ['Userscript'],
        operationId: 'getUserscriptAnnouncement',
        summary: 'Get announcement',
        description:
          'Returns the current service announcement consumed by the userscript. The response is empty when no announcement is active.',
      },
    },
  )
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
        ...(meta.geoJson ? { geoJson: meta.geoJson } : {}),
        footer: footer,
      };
    },
    {
      query: t.Object({
        mapId: t.String(),
        panoId: t.String(),
      }),
      response: buildResponses(
        {
          200: t.Object({
            country: t.String(),
            metaName: t.String(),
            note: t.String(),
            images: t.Array(t.String()),
            geoJson: t.Optional(t.Unknown()),
            footer: t.String(),
          }),
          404: t.Array(t.String()),
        },
        { public: true, validation: true },
      ),
      detail: {
        tags: ['Userscript'],
        operationId: 'getLocationMeta',
        summary: 'Get location meta',
        description:
          'Returns the synchronized meta note, images, attribution, and optional GeoJSON overlay for a panorama on a supported map.',
      },
    },
  )
  .use(bearer())
  .guard({
    headers: t.Object({
      authorization: t.Optional(t.String()),
    }),
    detail: { security: tokenSecurity },
  })
  .get(
    '/map-groups',
    async ({ status, bearer }) => {
      if (!bearer) {
        return status(401, unauthorizedResponse);
      }

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.apiToken, bearer),
        columns: { id: true },
      });
      if (!user) {
        return status(401, unauthorizedResponse);
      }

      const groups = await db.$primary
        .select({
          id: mapGroups.id,
          name: mapGroups.name,
          syncedAt: mapGroups.syncedAt,
          mapCount: sql<number>`count(${maps.id})::int`.mapWith(Number),
        })
        .from(mapGroupPermissions)
        .innerJoin(mapGroups, eq(mapGroups.id, mapGroupPermissions.mapGroupId))
        .innerJoin(maps, eq(maps.mapGroupId, mapGroups.id))
        .where(
          and(
            eq(mapGroupPermissions.userId, user.id),
            isNotNull(mapGroups.syncedAt),
          ),
        )
        .groupBy(mapGroups.id, mapGroups.name, mapGroups.syncedAt)
        .orderBy(asc(mapGroups.name), asc(mapGroups.id));

      return { groups };
    },
    {
      response: buildResponses(
        {
          200: t.Object({
            groups: t.Array(
              t.Object({
                id: Type.Integer(),
                name: t.String(),
                syncedAt: t.Union([Type.Integer(), t.Null()]),
                mapCount: Type.Integer(),
              }),
            ),
          }),
        },
        { unauthorized: true },
      ),
      detail: {
        tags: ['Map making tools'],
        operationId: 'listAccessibleMapGroups',
        summary: 'List map groups',
        description:
          'Lists synchronized map groups that the API token can access and that contain at least one map.',
        security: tokenSecurity,
      },
    },
  )
  .get(
    '/map-group/:groupId/maps',
    async ({ params: { groupId }, status, bearer }) => {
      if (!bearer) {
        return status(401, unauthorizedResponse);
      }

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.apiToken, bearer),
        columns: { id: true },
      });
      if (!user) {
        return status(401, unauthorizedResponse);
      }

      const [group] = await db.$primary
        .select({
          id: mapGroups.id,
          name: mapGroups.name,
          syncedAt: mapGroups.syncedAt,
        })
        .from(mapGroupPermissions)
        .innerJoin(mapGroups, eq(mapGroups.id, mapGroupPermissions.mapGroupId))
        .where(
          and(
            eq(mapGroupPermissions.userId, user.id),
            eq(mapGroups.id, groupId),
          ),
        );
      if (!group) {
        return status(404, notFoundResponse);
      }
      if (group.syncedAt === null) {
        return status(409, { message: 'Map group has not been synchronized' });
      }

      const groupMaps = await getSynchronizedGroupMapSnapshots(groupId);

      return {
        group: {
          id: group.id,
          name: group.name,
          syncedAt: group.syncedAt,
        },
        maps: groupMaps.map(({ mapId: _mapId, ...map }) => map),
      };
    },
    {
      params: t.Object({ groupId: t.Integer() }),
      response: buildResponses(
        {
          200: t.Object({
            group: t.Object({
              id: Type.Integer(),
              name: t.String(),
              syncedAt: t.Union([Type.Integer(), t.Null()]),
            }),
            maps: t.Array(
              t.Object({
                name: t.String(),
                geoguessrId: t.String(),
                locationCount: Type.Integer(),
                fingerprint: t.String(),
              }),
            ),
          }),
          409: t.Object({ message: t.String() }),
        },
        { unauthorized: true, notFound: true, validation: true },
      ),
      detail: {
        tags: ['Map making tools'],
        operationId: 'listMapGroupMaps',
        summary: 'Get group manifest',
        description:
          'Returns each map in a synchronized group with its location count and coordinate fingerprint.',
        security: tokenSecurity,
      },
    },
  )
  .get(
    '/map/:geoguessrId/locations',
    async ({ params: { geoguessrId }, query, status, bearer }) => {
      if (!bearer) {
        return status(401, unauthorizedResponse);
      }

      // authorized = the token belongs to the personal map's owner, or to a
      // user with permissions on the map's group
      const [data] = await db.$primary
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
        return status(404, notFoundResponse);
      }
      if (!data.authorized) {
        return status(403, forbiddenResponse);
      }
      const locations = await db.$primary
        .select({
          panoId: syncedLocations.panoId,
          lat: syncedLocations.lat,
          lng: syncedLocations.lng,
          heading: syncedLocations.heading,
          pitch: syncedLocations.pitch,
          zoom: syncedLocations.zoom,
        })
        .from(syncedMapMetas)
        .innerJoin(
          syncedLocations,
          eq(syncedLocations.syncedMetaId, syncedMapMetas.syncedMetaId),
        )
        .where(eq(syncedMapMetas.mapId, data.mapId));
      if (
        query.expectedFingerprint !== undefined &&
        fingerprintMapCoordinates(locations) !== query.expectedFingerprint
      ) {
        return status(409, {
          message: 'Synchronized map data changed; scan the group again',
        });
      }
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
    {
      params: t.Object({ geoguessrId: t.String() }),
      query: t.Object({
        expectedFingerprint: t.Optional(
          t.String({ pattern: '^[a-f0-9]{64}$' }),
        ),
      }),
      response: buildResponses(
        {
          200: t.Object({
            customCoordinates: t.Array(
              t.Object({
                lat: t.Number(),
                lng: t.Number(),
                heading: t.Number(),
                pitch: t.Number(),
                zoom: t.Number(),
                panoId: t.Union([t.String(), t.Null()]),
                countryCode: t.Null(),
                stateCode: t.Null(),
              }),
            ),
          }),
          409: t.Object({ message: t.String() }),
        },
        {
          unauthorized: true,
          forbidden: true,
          notFound: true,
          validation: true,
        },
      ),
      detail: {
        tags: ['Map making tools'],
        operationId: 'exportMapLocations',
        summary: 'Export locations',
        description:
          'Returns synchronized locations for a map in the shape accepted by GeoGuessr. Supply the manifest fingerprint to reject stale exports.',
        security: tokenSecurity,
      },
    },
  );
