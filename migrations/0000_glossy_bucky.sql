CREATE TABLE `map_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` blob
);
--> statement-breakpoint
CREATE TABLE `maps` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_group_id` integer NOT NULL,
	`name` text NOT NULL,
	`geoguessr_id` text NOT NULL,
	`filters` blob,
	FOREIGN KEY (`map_group_id`) REFERENCES `map_groups`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `metas` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_group_id` integer NOT NULL,
	`tag_name` text NOT NULL,
	`name` text NOT NULL,
	`note` text NOT NULL,
	`note_from_plonkit` integer DEFAULT false NOT NULL,
	`has_image` integer DEFAULT false NOT NULL,
	`level` integer DEFAULT 10 NOT NULL,
	FOREIGN KEY (`map_group_id`) REFERENCES `map_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maps_name_unique` ON `maps` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `maps_geoguessr_id_unique` ON `maps` (`geoguessr_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metas_unique` ON `metas` (`map_group_id`,`tag_name`);