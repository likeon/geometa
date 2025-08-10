import {
  mapGroupLocations,
  mapMetas,
  maps,
  metas,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { maybeWrapImageUrl } from '@api/lib/internal/utils';
import { generateFooter } from '@api/lib/userscript/utils';
import { and, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { personalMapsRouter } from './personal';

const syncedMetasStatement = db
  .select({
    id: syncedMetas.metaId,
    name: syncedMetas.name,
    note: syncedMetas.note,
    noteFromPlonkit: syncedMetas.noteFromPlonkit,
    footer: syncedMetas.footer,
    mapFooter: maps.footerHtml,
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
  })
  .from(syncedMapMetas)
  .innerJoin(syncedMetas, eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId))
  .innerJoin(maps, eq(maps.id, syncedMapMetas.mapId))
  .where(eq(syncedMapMetas.mapId, sql.placeholder('mapId')))
  .groupBy(
    syncedMetas.metaId,
    syncedMetas.name,
    syncedMetas.note,
    syncedMetas.noteFromPlonkit,
    syncedMetas.footer,
    syncedMetas.images,
    maps.footerHtml,
  )
  .prepare('get_synced_metas_by_map_id');

const syncedMetasPersonalStatement = db
  .select({
    id: syncedMetas.metaId,
    name: syncedMetas.name,
    note: syncedMetas.note,
    noteFromPlonkit: syncedMetas.noteFromPlonkit,
    footer: syncedMetas.footer,
    mapFooter: sql<string>`
      COALESCE((SELECT m.footer_html
      FROM ${syncedMapMetas} sm
      INNER JOIN ${maps} m ON m.id = sm.map_id
      WHERE
        sm.synced_meta_id = ${syncedMetas.metaId}
        AND m.is_personal = FALSE
      ORDER BY m.number_of_games_played DESC NULLS LAST, m.id ASC
      LIMIT 1), '')
    `,
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
  })
  .from(syncedMapMetas)
  .innerJoin(syncedMetas, eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId))
  .innerJoin(maps, eq(maps.id, syncedMapMetas.mapId))
  .where(eq(syncedMapMetas.mapId, sql.placeholder('mapId')))
  .groupBy(
    syncedMetas.metaId,
    syncedMetas.name,
    syncedMetas.note,
    syncedMetas.noteFromPlonkit,
    syncedMetas.footer,
    syncedMetas.images,
    maps.footerHtml,
  )
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
  .use(personalMapsRouter);
