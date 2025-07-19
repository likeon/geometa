-- Custom SQL migration file, put your code below! --
DELETE FROM synced_locations sl
  USING synced_metas sm,
      map_group_locations mgl,
      metas m
WHERE sl.synced_meta_id = sm.meta_id
  AND sm.map_group_id = mgl.map_group_id
  AND sl.pano_id = mgl.pano_id
  AND sm.map_group_id = m.map_group_id
  AND m.id = sl.synced_meta_id
  AND mgl.extra_tag != m.tag_name
  AND sm.map_group_id IS NOT NULL;
