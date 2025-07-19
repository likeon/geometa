ALTER TABLE "maps" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" DROP COLUMN "is_community";