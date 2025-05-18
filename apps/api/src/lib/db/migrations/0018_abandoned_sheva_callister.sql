ALTER TABLE "synced_locations" RENAME COLUMN "panoId" TO "pano_id";--> statement-breakpoint
ALTER TABLE "synced_locations" DROP CONSTRAINT "synced_locations_synced_meta_id_panoId_pk";--> statement-breakpoint
ALTER TABLE "synced_locations" ADD CONSTRAINT "synced_locations_synced_meta_id_pano_id_pk" PRIMARY KEY("synced_meta_id","pano_id");