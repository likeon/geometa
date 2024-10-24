-- Custom SQL migration file, put you code below! --
DROP VIEW map_locations_view;--> statement-breakpoint
CREATE VIEW map_locations_view AS
SELECT m.id AS map_id, lmv.lat, lmv.lng, lmv.heading, lmv.pitch, lmv.zoom, lmv.pano_id, lmv.meta_name, 
       lmv.extra_pano_id, lmv.extra_pano_date, lmv.extra_tag AS tag_name, lmv.meta_note, 
       lmv.meta_note_from_plonkit, lmv.meta_id
FROM location_metas_view lmv
JOIN maps m ON m.map_group_id = lmv.map_group_id 
AND (
    EXISTS (
        SELECT 1
        FROM map_levels
        JOIN meta_levels ON meta_levels.level_id = map_levels.level_id 
                          AND meta_levels.meta_id = lmv.meta_id
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
          AND lmv.extra_tag LIKE mf.tag_like COLLATE NOCASE
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
          AND lmv.extra_tag LIKE mf.tag_like COLLATE NOCASE
    )
);
