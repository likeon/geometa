DROP VIEW IF EXISTS location_metas_view;--> statement-breakpoint
CREATE VIEW location_metas_view AS
select mgl.*, m.id as meta_id, m.tag_name as meta_tag_name, m.name as meta_name, m.note as meta_note, m.note_from_plonkit as meta_note_from_plonkit, m.has_image as meta_has_image
from map_group_locations mgl
join metas m ON m.tag_name = mgl.extra_tag and m.map_group_id = mgl.map_group_id;
