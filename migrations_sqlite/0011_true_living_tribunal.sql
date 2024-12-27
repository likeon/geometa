CREATE TABLE `map_levels` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`level_id` integer NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_levels_unique` ON `map_levels` (`map_id`,`level_id`);--> statement-breakpoint

DROP VIEW map_locations_view;--> statement-breakpoint
DROP VIEW location_metas_view;

