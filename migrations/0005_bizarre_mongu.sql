CREATE VIEW map_locations AS
select m.id, lmv.lat, lmv.lng, lmv.heading, lmv.pitch, lmv.zoom, lmv.meta_name, lmv.extra_pano_id, lmv.extra_pano_date
from location_metas_view lmv
join meta_levels ml on ml.meta_id = lmv.meta_id
join levels l on l.id = ml.level_id
join maps m on m.map_group_id = lmv.map_group_id and (m.level_id = l.id or m.level_id is null);
