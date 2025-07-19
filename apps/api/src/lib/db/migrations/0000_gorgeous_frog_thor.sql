ALTER TABLE maps
ALTER COLUMN is_published
TYPE boolean
USING (is_published = 1);--> statement-breakpoint
ALTER TABLE maps
ALTER COLUMN is_community
TYPE boolean
USING (is_community = 1);--> statement-breakpoint
ALTER TABLE maps
ALTER COLUMN auto_update
TYPE boolean
USING (auto_update = 1);--> statement-breakpoint
ALTER TABLE maps
ALTER COLUMN is_verified
TYPE boolean
USING (is_verified = 1);--> statement-breakpoint

ALTER TABLE map_filters
ALTER COLUMN is_exclude
TYPE boolean
USING (is_exclude = 1);--> statement-breakpoint

ALTER TABLE metas
ALTER COLUMN note_from_plonkit
TYPE boolean
USING (note_from_plonkit = 1);--> statement-breakpoint
ALTER TABLE metas
ALTER COLUMN has_image
TYPE boolean
USING (has_image = 1);--> statement-breakpoint

ALTER TABLE "user"
ALTER COLUMN is_trusted
TYPE boolean
USING (is_trusted = 1);--> statement-breakpoint
ALTER TABLE "user"
ALTER COLUMN is_superadmin
TYPE boolean
USING (is_superadmin = 1);
