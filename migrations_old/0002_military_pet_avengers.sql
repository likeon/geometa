DROP TABLE session;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP VIEW "public"."map_locations_view";--> statement-breakpoint
DROP VIEW "public"."location_metas_view";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE VIEW "public"."location_metas_view" AS (
  select mgl.*,
         m.id                                     as meta_id,
         m.tag_name                               as meta_tag_name,
         m.name                                   as meta_name,
         m.note                                   as meta_note,
         m.note_html                              as meta_note_html,
         m.note_from_plonkit                      as meta_note_from_plonkit,
         m.has_image                              as meta_has_image,
         greatest(mgl.modified_at, m.modified_at) as max_modified_at
  from "map_group_locations" mgl
         join "metas" m ON m.tag_name = mgl.extra_tag and m.map_group_id = mgl.map_group_id
);--> statement-breakpoint
CREATE VIEW "public"."map_locations_view" AS (
  SELECT m.id                                         AS map_id,
         lmv.lat,
         lmv.lng,
         lmv.heading,
         lmv.pitch,
         lmv.zoom,
         lmv.pano_id,
         lmv.meta_name,
         lmv.extra_pano_id,
         lmv.extra_pano_date,
         lmv.extra_tag                                AS tag_name,
         lmv.meta_note,
         lmv.meta_note_html,
         lmv.meta_note_from_plonkit,
         lmv.meta_id,
         greatest(lmv.max_modified_at, m.modified_at) as max_modified_at
  FROM "location_metas_view" lmv
         JOIN "maps" m ON m.map_group_id = lmv.map_group_id
    AND (
                             EXISTS (SELECT 1
                                     FROM map_levels
                                            JOIN meta_levels ON meta_levels.level_id = map_levels.level_id
                                       AND meta_levels.meta_id = lmv.meta_id
                                     WHERE map_levels.map_id = m.id)
                               OR NOT EXISTS (SELECT 1
                                              FROM map_levels
                                              WHERE map_levels.map_id = m.id)
                             )
    AND (
                             EXISTS (SELECT 1
                                     FROM map_filters mf
                                     WHERE mf.map_id = m.id
                                       AND mf.is_exclude = FALSE
                                       AND lmv.extra_tag ILIKE mf.tag_like)
                               OR NOT EXISTS (SELECT 1
                                              FROM map_filters mf
                                              WHERE mf.map_id = m.id
                                                AND mf.is_exclude = FALSE)
                             )
    AND (
                             NOT EXISTS (SELECT 1
                                         FROM map_filters mf
                                         WHERE mf.map_id = m.id
                                           AND mf.is_exclude = TRUE
                                           AND lmv.extra_tag ILIKE mf.tag_like)
                             )
);
