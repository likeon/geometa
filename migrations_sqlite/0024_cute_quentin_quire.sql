ALTER TABLE `maps` ADD `description` text;--> statement-breakpoint
ALTER TABLE `maps` ADD `is_published` integer DEFAULT false NOT NULL;