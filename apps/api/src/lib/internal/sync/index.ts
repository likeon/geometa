import { db } from '@lib/drizzle';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import {
  mapGroupLocations,
  mapGroups,
  metaImages,
  metas,
} from '@lib/db/schema';
import { createRawSqlArray } from '@lib/db/utils';
import { getImageUrl } from './utils';

const metasSelectStatement = db
  .select({
    ...getTableColumns(metas),
    images: sql<string[]>`
    (SELECT array_agg(${metaImages.image_url} ORDER BY ${metaImages.id})
    FROM ${metaImages}
    WHERE ${metaImages.metaId} = ${metas.id})
  `,
  })
  .from(metas)
  .where(
    and(
      eq(metas.mapGroupId, sql.placeholder('mapGroupId')),
      sql`${sql.placeholder('groupSyncedAt')}::bigint IS NULL OR
      ${metas.modifiedAt} > ${sql.placeholder('groupSyncedAt')}::bigint`,
    ),
  )
  .prepare('metas_to_sync');

const metaLocationsSelectStatement = db
  .select()
  .from(mapGroupLocations)
  .innerJoin(
    metas,
    and(
      eq(metas.mapGroupId, mapGroupLocations.mapGroupId),
      eq(metas.tagName, mapGroupLocations.extraTag),
    ),
  )
  .where(
    and(
      eq(mapGroupLocations.mapGroupId, sql.placeholder('mapGroupId')),
      sql`${sql.placeholder('groupSyncedAt')}::bigint IS NULL OR
      ${mapGroupLocations.modifiedAt} > ${sql.placeholder('groupSyncedAt')}::bigint`,
    ),
  );

export async function syncMapGroup(groupId: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const group = await db.query.mapGroups.findFirst({
    where: eq(mapGroups.id, groupId),
  });
  if (!group) {
    throw new Error(`Invalid group id`);
  }

  const metasToSync = await metasSelectStatement.execute({
    mapGroupId: groupId,
    groupSyncedAt: group.syncedAt,
  });
  const metaValuesSql = sql.join(
    metasToSync.map(
      (meta) => sql`(
        ${meta.id},
        ${meta.mapGroupId},
        ${meta.name},
        ${meta.noteHtml},
        ${meta.noteFromPlonkit},
        ${meta.footerHtml},
        ${createRawSqlArray(meta.images.map(getImageUrl))}
      )`,
    ),
    sql.raw(', '),
  );
  await db.execute(sql`
    MERGE INTO synced_metas sm
    USING (
      VALUES ${metaValuesSql}
    ) as m(meta_id, map_group_id, name, note, note_from_plonkit, footer, images)
    ON sm.meta_id = m.meta_id
    WHEN MATCHED THEN
      UPDATE SET
        name = m.name,
        note = m.note,
        note_from_plonkit = m.note_from_plonkit,
        footer = m.footer,
        images = m.images
    WHEN NOT MATCHED BY TARGET THEN
      INSERT (meta_id, map_group_id, name, note,
              note_from_plonkit, footer, images)
      VALUES (m.meta_id, m.map_group_id, m.name, m.note,
              m.note_from_plonkit, m.footer, m.images)
    WHEN NOT MATCHED BY SOURCE AND
      sm.map_group_id = ${groupId} AND
      sm.meta_id NOT IN (SELECT m2.id FROM metas m2 WHERE m2.map_group_id = ${groupId}) THEN
        DELETE
    ;
  `);
}
