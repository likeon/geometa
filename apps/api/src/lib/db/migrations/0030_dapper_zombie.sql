DROP INDEX "location_request_logs_timestamp_idx";--> statement-breakpoint
DROP INDEX "location_request_logs_meta_idx";--> statement-breakpoint
CREATE INDEX "location_request_logs_meta_idx" ON "location_request_logs" USING btree ("synced_meta_id","timestamp");
CREATE INDEX IF NOT EXISTS smm_meta_id_inc_map_idx
  ON synced_map_metas (synced_meta_id) INCLUDE (map_id);
