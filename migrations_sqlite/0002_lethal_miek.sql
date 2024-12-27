ALTER TABLE `maps` ADD `level_id` integer REFERENCES levels(id);--> statement-breakpoint

ALTER TABLE `maps` DROP COLUMN `filters`;
