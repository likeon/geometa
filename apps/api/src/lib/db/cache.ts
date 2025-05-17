import { db } from '@lib/drizzle';
import { and, asc, eq, gt, or, sql, SQL } from 'drizzle-orm';
import { mapGroups, mapLocations, maps, metas, syncedMetas } from '@lib/db/schema';
import { generateFooter, generatePlonkitLink, getCountryFromTagName, getImageUrl } from '@lib/utils/metas';

const metasToSyncStatement = db.select().from(metas).where(and(
  eq(metas.mapGroupId, sql.placeholder('mapGroupId')),
  sql`${sql.placeholder('groupSyncedAt')}::bigint IS NULL OR ${metas.modifiedAt} > ${sql.placeholder('groupSyncedAt')}::bigint`
)).prepare('metas_to_sync');

export async function syncToCache(groupId: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const group = await db.query.mapGroups.findFirst({ where: eq(mapGroups.id, groupId) });
  if (!group) {
    throw new Error(`Invalid group id`);
  }

  const metasToSync = await metasToSyncStatement.execute(
    { mapGroupId: groupId, groupSyncedAt: group.syncedAt }
  );

  const preparedMetas = 1
  db.insert(syncedMetas)


}

