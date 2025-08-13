import { mapGroups, metaImages, metas, syncedMetas } from '@api/lib/db/schema';
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
      sql`(${sql.placeholder('groupSyncedAt')}::bigint IS NULL OR
      ${metas.modifiedAt} > ${sql.placeholder('groupSyncedAt')}::bigint)`,
    ),
  )
  .groupBy(...Object.values(getTableColumns(metas)))
  .prepare('metas_to_sync');

export async function syncMapGroup(group: {
  id: number;
  syncedAt: number | null;
}) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  await db.$primary.transaction(async (tx) => {
    // metas
    const metasToSync = await metasSelectStatement.execute({
      mapGroupId: group.id,
      groupSyncedAt: group.syncedAt,
    });
    const metaValuesSql = sql.join(
      metasToSync.map((meta) => {
        return sql`(
          ${meta.id}::bigint,
          ${meta.mapGroupId}::bigint,
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
        ;
    `);
    }
    await tx.delete(syncedMetas).where(
      sql`${syncedMetas.mapGroupId} = ${group.id} AND
        ${syncedMetas.metaId} NOT IN (SELECT id FROM ${metas} WHERE ${metas.mapGroupId} = ${group.id})`,
    );

    // remove locations that changed tag name

    await tx.execute(sql`
      DELETE FROM synced_locations sl
      USING synced_metas sm,
            map_group_locations mgl,
            metas m
      WHERE sl.synced_meta_id = sm.meta_id
        AND sm.map_group_id = ${group.id}
        AND mgl.map_group_id = sm.map_group_id
        AND mgl.pano_id = sl.pano_id
        AND m.map_group_id = sm.map_group_id
        AND m.id = sl.synced_meta_id
        AND mgl.extra_tag != m.tag_name
    `);

    // locations
    await tx.execute(sql`
      WITH l AS (
        select
          m.id as synced_meta_id,
          mgl.lat,
          mgl.lng,
          mgl.heading,
          mgl.pitch,
          mgl.zoom,
          mgl.pano_id,
          mgl.extra_tag,
          mgl.extra_pano_id,
          mgl.extra_pano_date
         from map_group_locations mgl
         join metas m on m.map_group_id = mgl.map_group_id and m.tag_name = mgl.extra_tag
         where mgl.map_group_id = ${group.id} and (${group.syncedAt}::bigint IS NULL OR
            mgl.modified_at > ${group.syncedAt}::bigint)
      )
      MERGE INTO synced_locations sl
      USING l
      ON sl.synced_meta_id = l.synced_meta_id AND sl.pano_id = l.pano_id
      WHEN MATCHED THEN
        UPDATE SET
          lat = l.lat,
          lng = l.lng,
          heading = l.heading,
          pitch = l.pitch,
          zoom = l.zoom,
          pano_id = l.pano_id,
          extra_tag = l.extra_tag,
          extra_pano_id = l.extra_pano_id,
          extra_pano_date = l.extra_pano_date,
          country = get_country_from_tag_name(l.extra_tag)
      WHEN NOT MATCHED BY TARGET THEN
        INSERT (synced_meta_id, lat, lng, heading, pitch, zoom, pano_id, extra_tag, extra_pano_id, extra_pano_date, country)
        VALUES (l.synced_meta_id, l.lat, l.lng, l.heading, l.pitch, l.zoom, l.pano_id, l.extra_tag, l.extra_pano_id, l.extra_pano_date, get_country_from_tag_name(l.extra_tag))
      ;
  `);
    await tx.execute(sql`
      DELETE FROM synced_locations sl
      USING synced_metas sm
      WHERE sm.meta_id      = sl.synced_meta_id
        AND sm.map_group_id = ${group.id}
        AND NOT EXISTS (
          SELECT 1
          FROM   map_group_locations mgl
          WHERE  mgl.map_group_id = sm.map_group_id
            AND  mgl.pano_id = sl.pano_id
        );
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
