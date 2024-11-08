ALTER TABLE `map_group_locations` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `map_group_locations` ADD `modified_at` integer DEFAULT 1730419200 NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `modified_at` integer DEFAULT 1730419200 NOT NULL;
