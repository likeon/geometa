CREATE TABLE `mapMetas` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`tag_name` text NOT NULL,
	`name` text NOT NULL,
	`note` text NOT NULL,
	`note_from_plonkit` integer DEFAULT false NOT NULL,
	`has_image` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maps` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`geoguessr_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta_entries_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `meta_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `meta_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meta_suggestions` (
	`id` integer PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`url` text NOT NULL,
	`description` text NOT NULL,
	`author_nickname` text,
	`status` text DEFAULT 'new'
);
--> statement-breakpoint
CREATE TABLE `meta_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mapmetas_UniqueIdx` ON `mapMetas` (`map_id`,`tag_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `maps_nameIdx` ON `maps` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `maps_geoguessrIdx` ON `maps` (`geoguessr_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `nameIdx` ON `meta_tags` (`name`);