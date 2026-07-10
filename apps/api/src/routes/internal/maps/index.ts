import { originalMapLateral } from '@api/lib/db/original-map';
import {
  mapGroupLocations,
  mapMetas,
  maps,
  metas,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
  users,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { maybeWrapImageUrl } from '@api/lib/internal/utils';
import { generateFooter } from '@api/lib/userscript/utils';
import { and, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { groupMapsRouter } from './group';
import { personalMapsRouter } from './personal';

const syncedMetaFields = {
  id: syncedMetas.metaId,
  name: syncedMetas.name,
  note: syncedMetas.note,
  noteFromPlonkit: syncedMetas.noteFromPlonkit,
  footer: syncedMetas.footer,
  images: syncedMetas.images,
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
    FROM ${syncedLocations}
    WHERE ${syncedLocations.syncedMetaId} = ${syncedMetas.metaId}
  )`,
};

const syncedMetasStatement = db
  .select({
    ...syncedMetaFields,
    mapFooter: maps.footerHtml,
  })
  .from(syncedMapMetas)
  .innerJoin(syncedMetas, eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId))
  .innerJoin(maps, eq(maps.id, syncedMapMetas.mapId))
  .where(eq(syncedMapMetas.mapId, sql.placeholder('mapId')))
  .prepare('get_synced_metas_by_map_id');

// personal maps take the footer from the meta's original (non-personal) map
const personalOriginalMap = originalMapLateral();
const syncedMetasPersonalStatement = db
  .select({
    ...syncedMetaFields,
    mapFooter: sql<string>`COALESCE(${personalOriginalMap.footerHtml}, '')`,
  })
  .from(syncedMapMetas)
  .innerJoin(syncedMetas, eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId))
  .leftJoinLateral(personalOriginalMap, sql`true`)
  .where(eq(syncedMapMetas.mapId, sql.placeholder('mapId')))
  .prepare('get_synced_metas_by_personal_map_id');

export const metasFromMapStatement = db
  .select({
    id: metas.id,
    name: mapMetas.metaName,
    note: mapMetas.metaNoteHtml,
    noteFromPlonkit: mapMetas.metaNoteFromPlonkit,
    footer: mapMetas.metaFooterHtml,
    mapFooter: mapMetas.mapFooterHtml,
    images: sql<string[]>`
      COALESCE(
        string_to_array(${mapMetas.metaImageUrls}, ','),
        '{}'
      )
    `,
    countries: sql<string[]>`
      ARRAY(
        SELECT DISTINCT get_country_from_tag_name(mgl.extra_tag)
        FROM ${mapGroupLocations} mgl
        JOIN ${maps} m ON m.map_group_id = mgl.map_group_id
        WHERE m.id = ${mapMetas.mapId}
          AND mgl.extra_tag = ${mapMetas.metaTag}
          AND mgl.extra_tag IS NOT NULL
          AND mgl.extra_tag <> ''
      )
    `,
    locationsCount: sql<number>`
      (
        SELECT COUNT(*)
        FROM ${mapGroupLocations} mgl
               JOIN ${maps} m ON m.map_group_id = mgl.map_group_id
        WHERE m.id = ${mapMetas.mapId}
          AND mgl.extra_tag = ${mapMetas.metaTag}
      )
    `,
  })
  .from(mapMetas)
  .innerJoin(
    metas,
    and(
      eq(mapMetas.metaTag, metas.tagName),
      eq(
        mapMetas.mapId,
        sql`(SELECT m.id FROM ${maps} m WHERE m.map_group_id = ${metas.mapGroupId} AND m.id = ${mapMetas.mapId})`,
      ),
    ),
  )
  .where(eq(mapMetas.mapId, sql.placeholder('mapId')))
  .prepare('get_metas_by_map_id_with_id');

export const mapsRouter = new Elysia({ prefix: '/maps' })
  .use(auth())
  .get('/', async () => {
    return db.$primary.select().from(maps);
  })
  .get(
    '/mapgroup/:geoguessrId',
    async ({ params: { geoguessrId }, status, userId }) => {
      const user = await db.$primary.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.isSuperadmin) {
        return status(403, 'Forbidden: Admin access required');
      }

      const map = await db.$primary.query.maps.findFirst({
        where: eq(maps.geoguessrId, geoguessrId),
        with: {
          mapGroup: {
            with: {
              permissions: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!map) {
        return status(404, 'Map not found');
      }

      // Check if it's a personal map
      if (map.isPersonal && map.userId) {
        const owner = await db.$primary.query.users.findFirst({
          where: eq(users.id, map.userId),
        });

        return {
          isPersonal: true,
          id: map.id,
          name: map.name,
          owner: owner?.username || 'Unknown',
          userId: map.userId,
        };
      }

      if (!map.mapGroup) {
        return status(404, 'Map has no associated mapgroup');
      }

      const owners = map.mapGroup.permissions
        .map((p) => p.user.username)
        .join(', ');

      return {
        isPersonal: false,
        ...map.mapGroup,
        owners,
      };
    },
    {
      params: t.Object({ geoguessrId: t.String() }),
      userId: true,
    },
  )
  .get(
    '/metas/:mapId',
    async ({ params: { mapId } }) => {
      const syncedMapQuery = await db
        .select({
          isPersonal: maps.isPersonal,
        })
        .from(syncedMapMetas)
        .innerJoin(maps, eq(syncedMapMetas.mapId, maps.id))
        .where(eq(syncedMapMetas.mapId, mapId))
        .limit(1);

      const wasMapSynced = syncedMapQuery.length > 0;
      let metas: Awaited<
        ReturnType<
          | typeof syncedMetasPersonalStatement.execute
          | typeof syncedMetasStatement.execute
          | typeof metasFromMapStatement.execute
        >
      >;

      if (wasMapSynced && syncedMapQuery[0].isPersonal) {
        metas = await syncedMetasPersonalStatement.execute({ mapId });
      } else if (wasMapSynced) {
        metas = await syncedMetasStatement.execute({ mapId });
      } else {
        metas = await metasFromMapStatement.execute({ mapId });
      }

      const allCountries = new Set(metas.flatMap((meta) => meta.countries));
      const isSingleCountry = allCountries.size === 1;

      return metas
        .map((meta) => {
          const footer = generateFooter(
            meta.noteFromPlonkit,
            meta.countries[0] || '',
            meta.footer,
            meta.mapFooter,
          );

          const name =
            isSingleCountry || meta.countries.length === 0
              ? meta.name
              : `${meta.countries[0]} - ${meta.name}`;

          //for metas that are taken not from syncedMeta images have no compression, we can remove it later when most map will be on new system
          const images = meta.images.map((image) => maybeWrapImageUrl(image));
          return {
            id: meta.id,
            name,
            note: meta.note,
            images,
            locationsCount: meta.locationsCount,
            footer,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    {
      params: t.Object({ mapId: t.Integer() }),
    },
  )
  .get(
    '/:geoguessrId',
    async ({ params: { geoguessrId }, status }) => {
      const map = await db.$primary.query.maps.findFirst({
        where: eq(maps.geoguessrId, geoguessrId),
      });
      if (!map) {
        return status(404, 'Map not found');
      }
      return map;
    },
    {
      params: t.Object({ geoguessrId: t.String() }),
    },
  )
  .use(personalMapsRouter)
  .use(groupMapsRouter);
