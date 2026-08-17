ALTER TABLE "user" ADD COLUMN "is_discord_verified" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discord_verified_messages" integer;
