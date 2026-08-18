CREATE TABLE "discord_challenge_map_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"map_id" bigint NOT NULL,
	"selected_at" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discord_challenge_map_history" ADD CONSTRAINT "discord_challenge_map_history_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_challenge_history_batch_map_unique" ON "discord_challenge_map_history" USING btree ("batch_id","map_id");--> statement-breakpoint
CREATE INDEX "discord_challenge_history_map_selected_idx" ON "discord_challenge_map_history" USING btree ("map_id","selected_at" DESC NULLS LAST);
