CREATE VIEW location_metas_view AS
SELECT mgl.*, m.*
FROM map_group_locations mgl
JOIN metas m ON m.tag_name = mgl.extra_tag AND m.map_group_id = mgl.map_group_id;
