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
CREATE TABLE `meta_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nameIdx` ON `meta_tags` (`name`);