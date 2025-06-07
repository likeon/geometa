-- Create TimescaleDB extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS timescaledb;
--> statement-breakpoint
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS "location_request_logs" (
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"map_id" bigint NOT NULL,
	"pano_id" text NOT NULL,
	"synced_meta_id" bigint
);
--> statement-breakpoint
-- Convert to TimescaleDB hypertable (if not already)
SELECT create_hypertable('location_request_logs', 'timestamp', if_not_exists => TRUE);
--> statement-breakpoint
-- Enable compression on the hypertable
ALTER TABLE location_request_logs SET (
	timescaledb.compress,
	timescaledb.compress_segmentby = 'synced_meta_id',
	timescaledb.compress_orderby = 'timestamp DESC'
);
--> statement-breakpoint
-- Add compression policy to compress chunks older than 7 days
SELECT add_compression_policy('location_request_logs', INTERVAL '31 days');
--> statement-breakpoint
-- Create composite index for efficient querying by meta_id with timestamp filtering
CREATE INDEX IF NOT EXISTS "location_request_logs_meta_idx" ON "location_request_logs" USING btree ("synced_meta_id", "timestamp");
