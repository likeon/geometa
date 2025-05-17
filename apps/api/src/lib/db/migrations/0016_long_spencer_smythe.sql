CREATE TABLE "synced_location" (
	"synced_meta_id" bigint NOT NULL,
	"panoId" text NOT NULL,
	"country" text,
	CONSTRAINT "synced_location_synced_meta_id_panoId_pk" PRIMARY KEY("synced_meta_id","panoId")
);
--> statement-breakpoint
CREATE TABLE "synced_map_meta" (
	"map_id" bigint NOT NULL,
	"synced_meta_id" bigint NOT NULL,
	CONSTRAINT "synced_map_meta_map_id_synced_meta_id_pk" PRIMARY KEY("map_id","synced_meta_id")
);
--> statement-breakpoint
CREATE TABLE "synced_meta" (
	"meta_id" bigint PRIMARY KEY NOT NULL,
	"map_group_id" bigint NOT NULL,
	"name" text NOT NULL,
	"note" text NOT NULL,
	"footer" text NOT NULL,
	"images" text[]
);
--> statement-breakpoint
DROP INDEX "cache_key_unique";--> statement-breakpoint
DROP INDEX "maps_geoguessr_id_unique";--> statement-breakpoint
ALTER TABLE "cache" ADD PRIMARY KEY ("key");--> statement-breakpoint
ALTER TABLE "maps" ALTER COLUMN "map_group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "is_personal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "synced_location" ADD CONSTRAINT "synced_location_synced_meta_id_synced_meta_meta_id_fk" FOREIGN KEY ("synced_meta_id") REFERENCES "public"."synced_meta"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_map_meta" ADD CONSTRAINT "synced_map_meta_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_map_meta" ADD CONSTRAINT "synced_map_meta_synced_meta_id_synced_meta_meta_id_fk" FOREIGN KEY ("synced_meta_id") REFERENCES "public"."synced_meta"("meta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synced_meta" ADD CONSTRAINT "synced_meta_map_group_id_map_groups_id_fk" FOREIGN KEY ("map_group_id") REFERENCES "public"."map_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maps_geoguessr_id_unique" ON "maps" USING btree ("geoguessr_id") WHERE "maps"."is_deleted" = $1;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "map_group_id_not_null" CHECK (("maps"."is_personal" AND "maps"."map_group_id" IS NULL)
          OR (NOT
          "maps"."is_personal"
          AND
          "maps"."map_group_id"
          IS
          NOT
          NULL
          ));
UPDATE map_groups SET synced_at = NULL;
