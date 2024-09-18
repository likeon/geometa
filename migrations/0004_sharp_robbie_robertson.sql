CREATE TABLE `mapMetas` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`type` text NOT NULL,
	`note` text NOT NULL,
	`image_url` text,
	`detail_url` text,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maps` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`geoguessr_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mapmetas_UniqueIdx` ON `mapMetas` (`map_id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `maps_nameIdx` ON `maps` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `maps_geoguessrIdx` ON `maps` (`geoguessr_id`);