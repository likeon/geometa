import { maps, syncedMapMetas } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, asc, eq, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { pick } from 'remeda';

const originalSyncedMapMetas = alias(syncedMapMetas, 'osmm');
const originalMaps = alias(maps, 'om');

// The "original" map of a synced meta: the most-played non-personal map that
// includes it. Personal maps borrow metas from shared maps, and footers /
// credits are taken from this original. Correlates on the outer query's
// syncedMapMetas.syncedMetaId, so attach it with leftJoinLateral in a query
// that selects from (or joins) syncedMapMetas.
export function originalMapLateral(...extraConditions: SQL[]) {
  return db
    .select(
      pick(originalMaps, ['footerHtml', 'name', 'authors', 'geoguessrId']),
    )
    .from(originalSyncedMapMetas)
    .innerJoin(originalMaps, eq(originalMaps.id, originalSyncedMapMetas.mapId))
    .where(
      and(
        eq(originalMaps.isPersonal, false),
        eq(originalSyncedMapMetas.syncedMetaId, syncedMapMetas.syncedMetaId),
        ...extraConditions,
      ),
    )
    .orderBy(
      sql`${originalMaps.numberOfGamesPlayed} DESC NULLS LAST`,
      asc(originalMaps.id),
    )
    .limit(1)
    .as('originalMap');
}
