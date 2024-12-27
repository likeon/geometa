CREATE TABLE `map_data` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`last_updated_panoids` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `maps` ADD `auto_update` integer DEFAULT false NOT NULL;