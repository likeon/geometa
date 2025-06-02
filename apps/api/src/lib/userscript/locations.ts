import {
  cacheTable,
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { pick } from 'remeda';

const originalSyncedMapMetas = alias(syncedMapMetas, 'osmm');
const originalMaps = alias(maps, 'om');
export const locationSelect = db
  .select({
    ...pick(getTableColumns(syncedMetas), [
      'name',
      'note',
      'footer',
      'images',
      'noteFromPlonkit',
    ]),
    country: syncedLocations.country,
    isPersonalMap: maps.isPersonal,
    mapFooter:
      sql<string>`coalesce(${originalMaps.footerHtml}, ${maps.footerHtml})`.as(
        'mapFooter',
      ),
    mapName: originalMaps.name,
    mapAuthors: originalMaps.authors,
    mapGeoguessrId: originalMaps.geoguessrId,
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
  .leftJoin(
    originalSyncedMapMetas,
    and(
      eq(maps.isPersonal, true),
      eq(originalSyncedMapMetas.syncedMetaId, syncedMapMetas.syncedMetaId),
    ),
  )
  .leftJoin(originalMaps, eq(originalMaps.id, originalSyncedMapMetas.mapId))
  .where(
    and(
      eq(maps.geoguessrId, sql.placeholder('mapId')),
      eq(syncedLocations.panoId, sql.placeholder('panoId')),
    ),
  )
  // prefer original map with footer
  .orderBy(desc(originalMaps.footerHtml))
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
