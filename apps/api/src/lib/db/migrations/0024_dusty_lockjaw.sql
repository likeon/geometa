ALTER TABLE "map_group_locations" ALTER COLUMN "pano_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "synced_locations" ADD COLUMN "lat" real;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "lng" real;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "heading" real;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "pitch" real;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "zoom" real;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "extra_tag" text;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "extra_pano_id" text;--> statement-breakpoint
ALTER TABLE "synced_locations" ADD COLUMN "extra_pano_date" text;--> statement-breakpoint

UPDATE synced_locations sli
SET lat =  l.lat,
    lng = l.lng,
    heading = l.heading,
    pitch= l.pitch,
    zoom = l.zoom,
    extra_tag = l.extra_tag,
    extra_pano_id = l.extra_pano_id,
    extra_pano_date = l.extra_pano_date
FROM synced_locations sl
         JOIN metas m ON m.id = sl.synced_meta_id
         JOIN map_group_locations l ON l.map_group_id = m.map_group_id AND l.pano_id = sl.pano_id
WHERE sli.synced_meta_id = sl.synced_meta_id AND sli.pano_id = sl.pano_id;--> statement-breakpoint

DELETE FROM synced_locations
WHERE lat IS NULL OR lng IS NULL OR heading IS NULL OR pitch IS NULL OR zoom IS NULL OR extra_tag IS NULL;

ALTER TABLE "synced_locations" ALTER COLUMN "lat" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "synced_locations" ALTER COLUMN "lng" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "synced_locations" ALTER COLUMN "heading" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "synced_locations" ALTER COLUMN "pitch" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "synced_locations" ALTER COLUMN "zoom" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "synced_locations" ALTER COLUMN "extra_tag" SET NOT NULL;
