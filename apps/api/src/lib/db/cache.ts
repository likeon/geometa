import { db } from '@lib/drizzle';
import { and, asc, eq, getTableColumns, gt, or, sql, SQL } from 'drizzle-orm';
import { mapGroups, mapLocations, maps, Meta, metaImages, metas, syncedMetas } from '@lib/db/schema';
import { generateFooter, generatePlonkitLink, getCountryFromTagName, getImageUrl } from '@lib/utils/metas';

const metasToSyncStatement = db.select({
  ...getTableColumns(metas),
  images: sql`
    (SELECT array_agg(${metaImages.image_url} ORDER BY ${metaImages.id})
    FROM ${metaImages}
    WHERE ${metaImages.metaId} = ${metas.id})
  `
}).from(metas).where(and(
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
  console.debug(metasToSync)

  // const preparedMetas = metasToSync.map((meta) => ({
  //   meta_id: meta.id,
  //   map_group_id: meta.mapGroupId,
  //   name: meta.name,
  //   note: meta.noteHtml,
  //   footer: meta.footerHtml
  // }));
  // db.insert(syncedMetas);


}

