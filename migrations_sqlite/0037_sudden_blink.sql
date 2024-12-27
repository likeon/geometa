DROP INDEX IF EXISTS `map_group_locations_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `map_group_locations_unique` ON `map_group_locations` (`map_group_id`,`pano_id`);