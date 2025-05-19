ALTER TABLE "maps" DROP CONSTRAINT "map_group_id_not_null";--> statement-breakpoint
DROP INDEX "maps_geoguessr_id_unique";--> statement-breakpoint
ALTER TABLE "maps" DROP COLUMN "is_deleted";--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_geoguessr_id_unique" UNIQUE("geoguessr_id");--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "map_group_id_not_null" CHECK (("maps"."is_personal" AND "maps"."map_group_id" IS NULL)
          OR (NOT "maps"."is_personal" AND "maps"."map_group_id" IS NOT NULL));