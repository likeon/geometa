CREATE TABLE "map_group_location_metas" (
	"location_id" bigint NOT NULL,
	"meta_id" integer NOT NULL,
	"map_group_id" integer NOT NULL,
	CONSTRAINT "map_group_location_metas_location_id_meta_id_pk" PRIMARY KEY("location_id","meta_id")
);
--> statement-breakpoint
ALTER TABLE "map_group_locations" ALTER COLUMN "extra_tag" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "map_group_locations_id_map_group_unique" ON "map_group_locations" USING btree ("id","map_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metas_id_map_group_unique" ON "metas" USING btree ("id","map_group_id");--> statement-breakpoint
ALTER TABLE "map_group_location_metas" ADD CONSTRAINT "map_group_location_metas_location_group_fk" FOREIGN KEY ("location_id","map_group_id") REFERENCES "public"."map_group_locations"("id","map_group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_group_location_metas" ADD CONSTRAINT "map_group_location_metas_meta_group_fk" FOREIGN KEY ("meta_id","map_group_id") REFERENCES "public"."metas"("id","map_group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "map_group_location_metas_meta_idx" ON "map_group_location_metas" USING btree ("meta_id");--> statement-breakpoint
INSERT INTO "map_group_location_metas" ("location_id", "meta_id", "map_group_id")
SELECT mgl.id, m.id, mgl.map_group_id
FROM map_group_locations mgl
JOIN metas m ON m.map_group_id = mgl.map_group_id AND m.tag_name = mgl.extra_tag
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP VIEW meta_locations_count_view;--> statement-breakpoint
DROP VIEW map_locations_view;--> statement-breakpoint
DROP VIEW location_metas_view;--> statement-breakpoint
CREATE VIEW location_metas_view AS
SELECT mgl.id,
    mgl.map_group_id,
    mgl.lat,
    mgl.lng,
    mgl.heading,
    mgl.pitch,
    mgl.zoom,
    m.tag_name AS extra_tag,
    mgl.extra_pano_id,
    mgl.extra_pano_date,
    mgl.pano_id,
    mgl.updated_at,
    mgl.modified_at,
    m.id AS meta_id,
    m.tag_name AS meta_tag_name,
    m.name AS meta_name,
    m.note AS meta_note,
    m.note_html AS meta_note_html,
    m.note_from_plonkit AS meta_note_from_plonkit,
    m.has_image AS meta_has_image,
    m.modified_at AS meta_modified_at
FROM map_group_locations mgl
JOIN map_group_location_metas lm
  ON lm.location_id = mgl.id AND lm.map_group_id = mgl.map_group_id
JOIN metas m ON m.id = lm.meta_id AND m.map_group_id = lm.map_group_id;--> statement-breakpoint
CREATE VIEW map_locations_view AS
WITH maps_with_levels AS (
       SELECT map_levels.map_id
       FROM map_levels
       GROUP BY map_levels.map_id
     ), map_meta_levels AS (
       SELECT ml.map_id, me.meta_id
       FROM map_levels ml
       JOIN meta_levels me ON me.level_id = ml.level_id
       GROUP BY ml.map_id, me.meta_id
     ), maps_with_includes AS (
       SELECT map_filters.map_id
       FROM map_filters
       WHERE map_filters.is_exclude = false
       GROUP BY map_filters.map_id
     ), possible_includes AS (
       SELECT mf.map_id, mf.tag_like
       FROM map_filters mf
       WHERE mf.is_exclude = false
       GROUP BY mf.map_id, mf.tag_like
     ), possible_excludes AS (
       SELECT mf.map_id, mf.tag_like
       FROM map_filters mf
       WHERE mf.is_exclude = true
       GROUP BY mf.map_id, mf.tag_like
     )
SELECT m.id AS map_id,
   lmv.lat,
   lmv.lng,
   lmv.heading,
   lmv.pitch,
   lmv.zoom,
   lmv.pano_id,
   lmv.meta_name,
   lmv.extra_pano_id,
   lmv.extra_pano_date,
   lmv.extra_tag AS tag_name,
   lmv.meta_note,
   lmv.meta_note_html,
   lmv.meta_note_from_plonkit,
   lmv.meta_id,
   lmv.modified_at,
   lmv.meta_modified_at,
   m.modified_at AS map_modified_at
FROM location_metas_view lmv
JOIN maps m ON m.map_group_id = lmv.map_group_id
LEFT JOIN maps_with_levels mwl ON mwl.map_id = m.id
LEFT JOIN map_meta_levels mml ON mml.map_id = m.id AND mml.meta_id = lmv.meta_id
LEFT JOIN maps_with_includes mwi ON mwi.map_id = m.id
LEFT JOIN possible_includes pi ON pi.map_id = m.id AND lmv.extra_tag ~~* pi.tag_like
LEFT JOIN possible_excludes pe ON pe.map_id = m.id AND lmv.extra_tag ~~* pe.tag_like
WHERE (mml.meta_id IS NOT NULL OR mwl.map_id IS NULL)
  AND (pi.map_id IS NOT NULL OR mwi.map_id IS NULL)
  AND pe.map_id IS NULL;--> statement-breakpoint
CREATE VIEW meta_locations_count_view AS
SELECT meta_id, COUNT(*) AS total
FROM location_metas_view
GROUP BY meta_id;
