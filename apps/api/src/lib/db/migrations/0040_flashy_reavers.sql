CREATE TABLE "discord_challenge_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_key" text NOT NULL,
	"time_limit" integer NOT NULL,
	"forbid_moving" boolean NOT NULL,
	"forbid_rotating" boolean NOT NULL,
	"forbid_zooming" boolean NOT NULL,
	"status" text NOT NULL,
	"lease_token" text,
	"lease_until" bigint,
	"created_at" bigint NOT NULL,
	"completed_at" bigint,
	CONSTRAINT "discord_challenge_batches_status_check" CHECK ("discord_challenge_batches"."status" IN ('pending', 'generating', 'complete', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" DROP CONSTRAINT "discord_challenge_map_history_map_id_maps_id_fk";
--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ALTER COLUMN "map_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ALTER COLUMN "selected_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD COLUMN "geoguessr_id" text;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD COLUMN "map_name" text;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD COLUMN "authors" text;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD COLUMN "difficulty" integer;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD COLUMN "challenge_url" text;--> statement-breakpoint
UPDATE "discord_challenge_map_history" AS history
SET
	"geoguessr_id" = maps."geoguessr_id",
	"map_name" = maps."name",
	"authors" = maps."authors",
	"difficulty" = maps."difficulty"
FROM "maps"
WHERE maps."id" = history."map_id";--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ALTER COLUMN "geoguessr_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ALTER COLUMN "map_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ALTER COLUMN "difficulty" SET NOT NULL;--> statement-breakpoint
INSERT INTO "discord_challenge_batches" (
	"id",
	"daily_key",
	"time_limit",
	"forbid_moving",
	"forbid_rotating",
	"forbid_zooming",
	"status",
	"created_at"
)
SELECT
	"batch_id",
	'legacy:' || "batch_id",
	0,
	false,
	false,
	false,
	'failed',
	min("selected_at")
FROM "discord_challenge_map_history"
GROUP BY "batch_id";--> statement-breakpoint
CREATE UNIQUE INDEX "discord_challenge_batches_daily_key_unique" ON "discord_challenge_batches" USING btree ("daily_key");--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD CONSTRAINT "discord_challenge_map_history_batch_id_discord_challenge_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."discord_challenge_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD CONSTRAINT "discord_challenge_map_history_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE set null ON UPDATE no action;
