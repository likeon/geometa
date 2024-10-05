CREATE TABLE `map_group_permissions` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_group_id` integer NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`map_group_id`) REFERENCES `map_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_group_permissions_unique` ON `map_group_permissions` (`map_group_id`,`user_id`);