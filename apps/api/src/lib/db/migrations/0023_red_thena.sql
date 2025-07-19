ALTER TABLE "user" ADD COLUMN "api_token" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_api_token_unique" UNIQUE("api_token");