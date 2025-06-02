import {
  cacheTable,
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { originalMapCTE } from '@api/lib/utils/common';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { pick } from 'remeda';

export const locationSelect = db
  .with(originalMapCTE)
  .select({
    ...pick(getTableColumns(syncedMetas), [
      'name',
      'note',
      'footer',
      'images',
      'noteFromPlonkit',
    ]),
    country: syncedLocations.country,
    mapFooter: sql<string>`
      CASE
        WHEN ${maps.isPersonal} = FALSE THEN ${maps.footerHtml}
        ELSE COALESCE(${originalMapCTE.footerHtml}, '')
      END
    `.as('mapFooter'),
    mapName: sql<string>`COALESCE(${originalMapCTE.name}, '')`.as('mapName'),
    mapAuthors: sql<string>`COALESCE(${originalMapCTE.authors}, '')`.as(
      'mapAuthors',
    ),
    mapGeoguessrId: sql<string>`COALESCE(${originalMapCTE.geoguessrId}, '')`.as(
      'mapGeoguessrId',
    ),
  })
  .from(syncedMetas)
  .innerJoin(
    syncedMapMetas,
    eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
  )
  .innerJoin(maps, eq(syncedMapMetas.mapId, maps.id))
  .innerJoin(
    syncedLocations,
    eq(syncedLocations.syncedMetaId, syncedMetas.metaId),
  )
  .leftJoin(originalMapCTE, eq(originalMapCTE.syncedMetaId, syncedMetas.metaId))
  .where(
    and(
      eq(maps.geoguessrId, sql.placeholder('mapId')),
      eq(syncedLocations.panoId, sql.placeholder('panoId')),
    ),
  )
  .limit(1)
  .prepare('userscript_get_location');

export const legacyLocationSelect = db
  .select({ value: cacheTable.value })
  .from(cacheTable)
  .where(eq(cacheTable.key, sql.placeholder('key')))
  .limit(1)
  .prepare('userscript_legacy_get_location');

export const mapLocationsExportSelect = db
  .select(
    pick(getTableColumns(syncedLocations), [
      'lat',
      'lng',
      'heading',
      'pitch',
      'zoom',
      'panoId',
    ]),
  )
  .from(syncedMetas)
  .innerJoin(
    syncedMapMetas,
    eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
  )
  .innerJoin(
    syncedLocations,
    eq(syncedLocations.syncedMetaId, syncedMetas.metaId),
  )
  .where(eq(syncedMapMetas.mapId, sql.placeholder('mapId')))
  .prepare('userscript_map_get_locations');
