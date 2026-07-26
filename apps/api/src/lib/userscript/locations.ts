import { originalMapLateral } from '@api/lib/db/original-map';
import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { pick } from 'remeda';

// only credit an original map when the played map itself is personal
const originalMap = originalMapLateral(eq(maps.isPersonal, true));

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
  // A location can carry several metas and players mostly read whichever tab
  // opens first, so ordering by anything constant (a name) would bury the same
  // meta on every location it appears on. Hashing the pano together with the
  // meta varies the winner per location while staying identical every time the
  // same location is served.
  .orderBy(
    sql`md5(${syncedLocations}.pano_id || ${syncedMetas}.meta_id::text)`,
    syncedMetas.metaId,
  )
  .prepare('userscript_get_location');

// distinct: a pano shared by several of the map's metas must still be exported
// once, or it gets extra chances of being drawn in game
export const mapLocationsExportSelect = db
  .selectDistinct(
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
