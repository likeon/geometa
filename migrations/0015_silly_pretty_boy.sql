CREATE TABLE IF NOT EXISTS "cache" (
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cache_key_unique" ON "cache" USING btree ("key");