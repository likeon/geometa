CREATE TABLE `map_filters` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`tag_like` text,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_filters_unique` ON `map_filters` (`map_id`,`tag_like`);