-- Custom SQL migration file, put you code below! --
CREATE VIEW map_metas_view AS
SELECT 
    m.geoguessr_id,
    m.id AS map_id,             
    metas.name AS meta_name,     
    metas.note_html AS meta_note_html,  
    GROUP_CONCAT(mi.image_url) AS meta_image_urls  -- Aggregates all image URLs into a single comma-separated string
FROM maps m
JOIN metas ON metas.map_group_id = m.map_group_id
LEFT JOIN meta_images mi ON mi.meta_id = metas.id
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
          AND metas.tag_name LIKE mf.tag_like COLLATE NOCASE
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
          AND metas.tag_name LIKE mf.tag_like COLLATE NOCASE
    )
)
GROUP BY m.geoguessr_id, metas.id;