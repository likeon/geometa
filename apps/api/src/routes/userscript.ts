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
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.94';
const tokenSecurity = [{ learnableMetaToken: [] as string[] }];

const mapGroup = t.Object({
  id: t.Integer({ description: 'LearnableMeta map group ID.' }),
  name: t.String({ description: 'Map group name.' }),
  syncedAt: t.Integer({
    description: 'Last synchronization time as a Unix timestamp.',
  }),
});

const mapManifest = t.Object({
  name: t.String({ description: 'Map name.' }),
  geoguessrId: t.String({ description: 'GeoGuessr map ID.' }),
  locationCount: t.Integer({
    minimum: 0,
    description: 'Number of synchronized locations in the map.',
  }),
  fingerprint: t.String({
    pattern: '^[a-f0-9]{64}$',
    description: 'SHA-256 fingerprint of the synchronized coordinates.',
  }),
});

const exportedLocation = t.Object({
  lat: t.Number({ description: 'Latitude.' }),
  lng: t.Number({ description: 'Longitude.' }),
  heading: t.Number({ description: 'Street View heading.' }),
  pitch: t.Number({ description: 'Street View pitch.' }),
  zoom: t.Number({ description: 'Street View zoom.' }),
  panoId: t.String({ description: 'Google Street View panorama ID.' }),
  countryCode: t.Null({ description: 'Reserved for GeoGuessr imports.' }),
  stateCode: t.Null({ description: 'Reserved for GeoGuessr imports.' }),
});

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
      params: t.Object({
        geoguessrId: t.String({ description: 'GeoGuessr map ID.' }),
      }),
      response: {
        200: t.Object(
          {
            mapFound: t.Literal(true),
            isPersonal: t.Boolean({
              description: 'Whether this is a personal map.',
            }),
            userscriptVersion: t.Literal(userscriptVersion),
          },
          { description: 'The map is available to the userscript.' },
        ),
        404: t.Object(
          {
            mapFound: t.Literal(false),
            userscriptVersion: t.Literal(userscriptVersion),
          },
          { description: 'No LearnableMeta map uses this GeoGuessr ID.' },
        ),
      },
      detail: {
        tags: ['Userscript'],
        operationId: 'getMapCompatibility',
        summary: 'Check map compatibility',
        description:
          'Checks whether LearnableMeta supports a GeoGuessr map and returns the userscript data version.',
      },
    },
  )
  .get(
    '/announcement/',
    async () => {
      return;
    },
    {
      response: {
        200: t.Void({ description: 'No active announcement.' }),
      },
      detail: {
        tags: ['Userscript'],
        operationId: 'getUserscriptAnnouncement',
        summary: 'Get userscript announcement',
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
        mapId: t.String({ description: 'GeoGuessr map ID.' }),
        panoId: t.String({
          description: 'Google Street View panorama ID for the location.',
        }),
      }),
      response: {
        200: t.Object(
          {
            country: t.String({ description: 'Location country name.' }),
            metaName: t.String({ description: 'Public meta name.' }),
            note: t.String({ description: 'Rendered meta note HTML.' }),
            images: t.Array(t.String(), {
              description: 'Meta image URLs.',
            }),
            geoJson: t.Optional(
              t.Unknown({
                description: 'GeoJSON overlay associated with the meta.',
              }),
            ),
            footer: t.String({ description: 'Rendered attribution HTML.' }),
          },
          { description: 'Meta content for this map location.' },
        ),
        404: t.Tuple([t.Literal('NOT_FOUND')], {
          description: 'No synchronized meta matches the location.',
        }),
        422: t.Unknown({ description: 'The query parameters are invalid.' }),
      },
      detail: {
        tags: ['Userscript'],
        operationId: 'getLocationMeta',
        summary: 'Get meta for a location',
        description:
          'Returns the synchronized meta note, images, attribution, and optional GeoJSON overlay for a panorama on a supported map.',
      },
    },
  )
  .use(bearer())
  .get(
    '/map-groups',
    async ({ status, bearer }) => {
      if (!bearer) {
        return status(401, 'Unauthorized');
      }

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.apiToken, bearer),
        columns: { id: true },
      });
      if (!user) {
        return status(401, 'Unauthorized');
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

      return {
        groups: groups.map((group) => ({
          ...group,
          syncedAt: group.syncedAt!,
        })),
      };
    },
    {
      response: {
        200: t.Object(
          {
            groups: t.Array(
              t.Composite([
                mapGroup,
                t.Object({
                  mapCount: t.Integer({
                    minimum: 0,
                    description: 'Number of maps in the group.',
                  }),
                }),
              ]),
            ),
          },
          { description: 'Synchronized map groups accessible to the token.' },
        ),
        401: t.Literal('Unauthorized', {
          description: 'The API token is missing or invalid.',
        }),
      },
      detail: {
        tags: ['Map making tools'],
        operationId: 'listAccessibleMapGroups',
        summary: 'List accessible map groups',
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
        return status(401, 'Unauthorized');
      }

      const user = await db.$primary.query.users.findFirst({
        where: eq(users.apiToken, bearer),
        columns: { id: true },
      });
      if (!user) {
        return status(401, 'Unauthorized');
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
        return status(404, 'Not Found');
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
      params: t.Object({
        groupId: t.Integer({ description: 'LearnableMeta map group ID.' }),
      }),
      response: {
        200: t.Object(
          {
            group: mapGroup,
            maps: t.Array(mapManifest),
          },
          { description: 'Map manifest for the synchronized group.' },
        ),
        401: t.Literal('Unauthorized', {
          description: 'The API token is missing or invalid.',
        }),
        404: t.Literal('Not Found', {
          description: 'The map group does not exist or is not accessible.',
        }),
        409: t.Object(
          { message: t.String() },
          { description: 'The map group has not been synchronized.' },
        ),
        422: t.Unknown({ description: 'The map group ID is invalid.' }),
      },
      detail: {
        tags: ['Map making tools'],
        operationId: 'listMapGroupMaps',
        summary: 'Get a map group manifest',
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
        return status(401, 'Unauthorized');
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
        return status(404, 'Not Found');
      }
      if (!data.authorized) {
        return status(403, 'Forbidden');
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
      params: t.Object({
        geoguessrId: t.String({ description: 'GeoGuessr map ID.' }),
      }),
      query: t.Object({
        expectedFingerprint: t.Optional(
          t.String({
            pattern: '^[a-f0-9]{64}$',
            description:
              'Expected SHA-256 coordinate fingerprint from the group manifest.',
          }),
        ),
      }),
      response: {
        200: t.Object(
          { customCoordinates: t.Array(exportedLocation) },
          { description: 'Locations in GeoGuessr custom-coordinate format.' },
        ),
        401: t.Literal('Unauthorized', {
          description: 'The API token is missing.',
        }),
        403: t.Literal('Forbidden', {
          description: 'The API token cannot access this map.',
        }),
        404: t.Literal('Not Found', {
          description: 'The map does not exist.',
        }),
        409: t.Object(
          { message: t.String() },
          {
            description:
              'The map changed after the supplied fingerprint was created.',
          },
        ),
        422: t.Unknown({ description: 'The request parameters are invalid.' }),
      },
      detail: {
        tags: ['Map making tools'],
        operationId: 'exportMapLocations',
        summary: 'Export synchronized map locations',
        description:
          'Returns synchronized locations for a map in the shape accepted by GeoGuessr. Supply the manifest fingerprint to reject stale exports.',
        security: tokenSecurity,
      },
    },
  );
