import {
  mapGroupLocations,
  mapGroups,
  metaImages,
  metas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { getImageUrl } from './utils';

const metasSelectStatement = db
  .select({
    ...getTableColumns(metas),
    images: sql<string[]>`
      COALESCE(
        array_agg(${metaImages.image_url} ORDER BY ${metaImages.id})
        FILTER (WHERE ${metaImages.image_url} IS NOT NULL),
        '{}'
      )
    `,
  })
  .from(metas)
  .leftJoin(metaImages, eq(metaImages.metaId, metas.id))
  .where(
    and(
      eq(metas.mapGroupId, sql.placeholder('mapGroupId')),
      sql`${sql.placeholder('groupSyncedAt')}::bigint IS NULL OR
      ${metas.modifiedAt} > ${sql.placeholder('groupSyncedAt')}::bigint`,
    ),
  )
  .groupBy(...Object.values(getTableColumns(metas)))
  .prepare('metas_to_sync');

export async function syncMapGroup(group: {
  id: number;
  syncedAt: number | null;
}) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    // metas
    const metasToSync = await metasSelectStatement.execute({
      mapGroupId: group.id,
      groupSyncedAt: group.syncedAt,
    });
    const metaValuesSql = sql.join(
      metasToSync.map((meta) => {
        return sql`(
          ${meta.id},
          ${meta.mapGroupId},
          ${meta.name},
          ${meta.noteHtml},
          ${meta.noteFromPlonkit},
          ${meta.footerHtml},
          string_to_array(${meta.images.map(getImageUrl).join('|')}, '|')
        )`;
      }),
      sql.raw(', '),
    );
    if (metasToSync.length) {
      await tx.execute(sql`
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
    } else {
      tx.delete(syncedMetas).where(eq(syncedMetas.mapGroupId, group.id));
    }

    // locations
    await tx.execute(sql`
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
      WHEN NOT MATCHED BY SOURCE AND sl.synced_meta_id NOT IN (SELECT sm.meta_id FROM synced_metas sm) THEN
        DELETE
      ;
  `);

    // map-meta association
    await tx.execute(sql`
      WITH mm AS (
        SELECT DISTINCT
            m.id as map_id,
            metas.id as synced_meta_id
        FROM maps m
        JOIN metas ON metas.map_group_id = m.map_group_id
        WHERE (
            EXISTS (
                SELECT 1
                FROM map_levels
                JOIN meta_levels ON meta_levels.level_id = map_levels.level_id
                                  AND meta_levels.meta_id = metas.id
                WHERE map_levels.map_id = m.id
            )
            OR NOT EXISTS (
                SELECT 1
                FROM map_levels
                WHERE map_levels.map_id = m.id
            )
        )
        AND (
            EXISTS (
                SELECT 1
                FROM map_filters mf
                WHERE mf.map_id = m.id
                  AND mf.is_exclude = FALSE
                  AND metas.tag_name ILIKE mf.tag_like
            )
            OR NOT EXISTS (
                SELECT 1
                FROM map_filters mf
                WHERE mf.map_id = m.id AND mf.is_exclude = FALSE
            )
        )
        AND (
            NOT EXISTS (
                SELECT 1
                FROM map_filters mf
                WHERE mf.map_id = m.id
                  AND mf.is_exclude = TRUE
                  AND metas.tag_name ILIKE mf.tag_like
            )
        ) AND metas.map_group_id = ${group.id})
      MERGE INTO synced_map_metas smm
      USING mm
      ON smm.map_id = mm.map_id AND smm.synced_meta_id = mm.synced_meta_id
      WHEN NOT MATCHED BY TARGET THEN
        INSERT (map_id, synced_meta_id)
        VALUES (mm.map_id, mm.synced_meta_id)
      WHEN NOT MATCHED BY SOURCE AND smm.map_id IN (
        SELECT DISTINCT mm.map_id
        FROM mm
      ) THEN
        DELETE
      ;
    `);
    await tx
      .update(mapGroups)
      .set({ syncedAt: currentTimestamp })
      .where(eq(mapGroups.id, group.id));
  });
}
