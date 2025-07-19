import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { pick } from 'remeda';

const originalSyncedMapMetas = alias(syncedMapMetas, 'osmm');
const originalMaps = alias(maps, 'om');

const originalMap = db
  .select(pick(originalMaps, ['footerHtml', 'name', 'authors', 'geoguessrId']))
  .from(originalSyncedMapMetas)
  .innerJoin(originalMaps, eq(originalMaps.id, originalSyncedMapMetas.mapId))
  .where(
    and(
      eq(maps.isPersonal, true),
      eq(originalSyncedMapMetas.syncedMetaId, syncedMapMetas.syncedMetaId),
    ),
  )
  .orderBy(sql`${originalMaps.numberOfGamesPlayed} DESC NULLS LAST`)
  .limit(1)
  .as('originalMap');

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
      sql<string>`coalesce(${originalMap.footerHtml}, ${maps.footerHtml})`.as(
        'mapFooter',
      ),
    mapName: originalMap.name,
    mapAuthors: originalMap.authors,
    mapGeoguessrId: originalMap.geoguessrId,
    // For logging purposes
    mapId: maps.id,
    syncedMetaId: syncedMetas.metaId,
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
  .leftJoinLateral(originalMap, sql`true`)
  .where(
    and(
      eq(maps.geoguessrId, sql.placeholder('mapId')),
      eq(syncedLocations.panoId, sql.placeholder('panoId')),
    ),
  )
  .limit(1)
  .prepare('userscript_get_location');

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
