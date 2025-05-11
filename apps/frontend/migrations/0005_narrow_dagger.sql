CREATE OR REPLACE VIEW map_locations_view AS
WITH maps_with_levels AS (SELECT map_id
                          FROM map_levels
                          GROUP BY map_id),
     map_meta_levels AS (SELECT ml.map_id, me.meta_id
                         FROM map_levels ml
                                  JOIN meta_levels me ON me.level_id = ml.level_id
                         GROUP BY ml.map_id, me.meta_id),
     maps_with_includes AS (SELECT map_id
                            FROM map_filters
                            WHERE is_exclude = FALSE
                            GROUP BY map_id),
     possible_includes AS (SELECT mf.map_id, mf.tag_like
                           FROM map_filters mf
                           WHERE mf.is_exclude = FALSE
                           GROUP BY mf.map_id, mf.tag_like),
     possible_excludes AS (SELECT mf.map_id, mf.tag_like
                           FROM map_filters mf
                           WHERE mf.is_exclude = TRUE
                           GROUP BY mf.map_id, mf.tag_like)

SELECT m.id                                         AS map_id,
       lmv.lat,
       lmv.lng,
       lmv.heading,
       lmv.pitch,
       lmv.zoom,
       lmv.pano_id,
       lmv.meta_name,
       lmv.extra_pano_id,
       lmv.extra_pano_date,
       lmv.extra_tag                                AS tag_name,
       lmv.meta_note,
       lmv.meta_note_html,
       lmv.meta_note_from_plonkit,
       lmv.meta_id,
       GREATEST(lmv.max_modified_at, m.modified_at) AS max_modified_at
FROM location_metas_view lmv
         JOIN maps m
              ON m.map_group_id = lmv.map_group_id

         LEFT JOIN maps_with_levels mwl
                   ON mwl.map_id = m.id

         LEFT JOIN map_meta_levels mml
                   ON mml.map_id = m.id
                       AND mml.meta_id = lmv.meta_id

         LEFT JOIN maps_with_includes mwi
                   ON mwi.map_id = m.id

         LEFT JOIN possible_includes pi
                   ON pi.map_id = m.id
                       AND lmv.extra_tag ILIKE pi.tag_like

         LEFT JOIN possible_excludes pe
                   ON pe.map_id = m.id
                       AND lmv.extra_tag ILIKE pe.tag_like

WHERE (mml.meta_id IS NOT NULL OR mwl.map_id IS NULL)
  AND (pi.map_id IS NOT NULL OR mwi.map_id IS NULL)
  AND pe.map_id IS NULL
;
