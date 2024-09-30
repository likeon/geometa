CREATE TABLE `meta_images` (
	`id` integer PRIMARY KEY NOT NULL,
	`meta_id` integer NOT NULL,
	`image_url` text NOT NULL,
	FOREIGN KEY (`meta_id`) REFERENCES `metas`(`id`) ON UPDATE no action ON DELETE cascade
);
