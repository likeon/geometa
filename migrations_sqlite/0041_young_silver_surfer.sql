CREATE TABLE `map_regions` (
	`id` integer PRIMARY KEY NOT NULL,
	`map_id` integer NOT NULL,
	`region_id` integer NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ordering` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO regions(name, ordering)
VALUES ('World', 0), ('Europe', 1), ('Asia', 2),
       ('South America', 3), ('North America', 4), ('Oceania', 5),
       ('Africa', 6)
