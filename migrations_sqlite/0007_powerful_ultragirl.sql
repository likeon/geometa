DROP VIEW IF EXISTS map_locations;--> statement-breakpoint
DROP VIEW IF EXISTS location_metas_view;--> statement-breakpoint

CREATE VIEW location_metas_view AS
select mgl.*, m.id as meta_id, m.tag_name as meta_tag_name, m.name as meta_name, m.note as meta_note, m.note_from_plonkit as meta_note_from_plonkit, m.has_image as meta_has_image
from map_group_locations mgl
join metas m ON m.tag_name = mgl.extra_tag and m.map_group_id = mgl.map_group_id;--> statement-breakpoint

CREATE VIEW map_locations_view AS
select m.id as map_id, lmv.lat, lmv.lng, lmv.heading, lmv.pitch, lmv.zoom, lmv.meta_name, lmv.extra_pano_id, lmv.extra_pano_date
from location_metas_view lmv
join meta_levels ml on ml.meta_id = lmv.meta_id
join levels l on l.id = ml.level_id
join maps m on m.map_group_id = lmv.map_group_id and (m.level_id = l.id or m.level_id is null);
