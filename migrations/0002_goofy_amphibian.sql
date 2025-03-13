CREATE VIEW map_metas_view AS
SELECT
    m.geoguessr_id,
    m.id AS map_id,
    m.name AS map_name,
    m.footer_html AS map_footer_html,
    metas.name AS meta_name,
    metas.tag_name AS meta_tag,
    metas.note_html AS meta_note_html,
    metas.footer_html AS meta_footer_html,
    (
        SELECT STRING_AGG(mi.image_url, ',' ORDER BY mi.id)
        FROM meta_images mi
        WHERE mi.meta_id = metas.id
    ) AS meta_image_urls
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
)
GROUP BY
    m.geoguessr_id,
    m.id,
    m.name,
    m.footer_html,
    metas.id,
    metas.name,
    metas.tag_name,
    metas.note_html,
    metas.footer_html;
