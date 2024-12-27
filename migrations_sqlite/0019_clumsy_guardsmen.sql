DROP VIEW map_locations_view;--> statement-breakpoint
CREATE VIEW map_locations_view AS
select m.id as map_id, lmv.lat, lmv.lng, lmv.heading, lmv.pitch, lmv.zoom, lmv.pano_id, lmv.meta_name, lmv.extra_pano_id, lmv.extra_pano_date, lmv.extra_tag as tag_name, lmv.meta_note, lmv.meta_note_from_plonkit
from location_metas_view lmv
join maps m on m.map_group_id = lmv.map_group_id and (
    exists(
        select 1
        from map_levels
        join meta_levels on meta_levels.level_id = map_levels.level_id and meta_levels.meta_id = lmv.meta_id
        where map_levels.map_id = m.id
    ) or not exists(
        select 1
        from map_levels
        where map_levels.map_id = m.id
    )
)
and (
    exists(
        select 1
        from map_filters mf
        where mf.map_id = m.id AND lmv.extra_tag like mf.tag_like COLLATE NOCASE
    ) or not exists(
        select 1
        from map_filters mf
        where mf.map_id = m.id
    )
);
