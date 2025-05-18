import {
  mapGroupLocations,
  mapGroups,
  metaImages,
  metas,
} from '@lib/db/schema';
import { createRawSqlArray } from '@lib/db/utils';
import { db } from '@lib/drizzle';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
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

export async function syncMapGroup(group: {
  id: number;
  syncedAt: number | null;
}) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (!group) {
    throw new Error('Invalid group id');
  }

  // metas
  const metasToSync = await metasSelectStatement.execute({
    mapGroupId: group.id,
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
      sm.map_group_id = ${group.id} AND
      sm.meta_id NOT IN (SELECT m2.id FROM metas m2 WHERE m2.map_group_id = ${group.id}) THEN
        DELETE
    ;
  `);

  // locations
  await db.execute(sql`
    WITH l AS (
      select
        "metas"."id" as synced_meta_id,
        "map_group_locations"."pano_id",
        "map_group_locations"."extra_tag"
       from "map_group_locations"
       join "metas" on ("metas"."map_group_id" = "map_group_locations"."map_group_id" and "metas"."tag_name" = "map_group_locations"."extra_tag")
       where ("map_group_locations"."map_group_id" = ${group.id} and (${group.syncedAt}::bigint IS NULL OR
          ${mapGroupLocations.modifiedAt} > ${group.syncedAt}::bigint))
    )
    MERGE INTO synced_locations sl
    USING l
    ON sl.synced_meta_id = l.synced_meta_id AND sl.pano_id = l.pano_id
    WHEN NOT MATCHED BY TARGET THEN
      INSERT (synced_meta_id, pano_id, country)
      VALUES (l.synced_meta_id, l.pano_id, get_country_from_tag_name(l.extra_tag))
    WHEN NOT MATCHED BY SOURCE AND sl.synced_meta_id NOT IN (SELECT sm.meta_id FROM synced_metas sm WHERE sm.map_group_id = ${group.id}) THEN
      DELETE
    ;
  `);

  // map-meta association
}
