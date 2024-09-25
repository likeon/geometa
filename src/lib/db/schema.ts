import { text, integer, sqliteTable, uniqueIndex, blob, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const metaSuggestions = sqliteTable('meta_suggestions', {
	id: integer('id').primaryKey(),
	secret: text('secret').notNull(),
	url: text('url').notNull(),
	description: text('description').notNull(),
	author_nickname: text('author_nickname'),
	status: text('status').default('new')
});

export const mapGroups = sqliteTable('map_groups', {
	id: integer('id').primaryKey(),
	name: text('name').notNull()
});

export const mapGroupsRelations = relations(mapGroups, ({ many }) => ({
	metas: many(metas),
	maps: many(maps),
	locations: many(mapGroupLocations),
}));

export const mapGroupLocations = sqliteTable('map_group_locations', {
	id: integer('id').primaryKey(),
	mapGroupId: integer('map_group_id')
		.notNull()
		.references(() => mapGroups.id, { onDelete: 'cascade' }),
	lat: real('lat'),
	lng: real('lng'),
	tag: text('tag')
});
export const mapGroupLocationsRelations = relations(mapGroupLocations, ({ one }) => ({
	mapGroup: one(mapGroups, { fields: [mapGroupLocations.mapGroupId], references: [mapGroups.id] })
}));

export const maps = sqliteTable(
	'maps',
	{
		id: integer('id').primaryKey(),
		mapGroupId: integer('map_group_id')
			.notNull()
			.references(() => mapGroups.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		geoguessrId: text('geoguessr_id').notNull(),
		filters: blob('filters')
	},
	(t) => ({
		nameUnique: uniqueIndex('maps_name_unique').on(t.name),
		geoguessrIdUnique: uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId)
	})
);
export const mapsRelations = relations(maps, ({ one }) => ({
	mapGroup: one(mapGroups, { fields: [maps.mapGroupId], references: [mapGroups.id] })
}));

export const levels = sqliteTable(
	'levels',
	{
		id: integer('id').primaryKey(),
		mapGroupId: integer('map_group_id')
			.notNull()
			.references(() => mapGroups.id, { onDelete: 'cascade' }),
		name: text('name').notNull()
	},
	(t) => ({
		nameUnique: uniqueIndex('levels_unique').on(t.name, t.mapGroupId)
	})
);

export const metas = sqliteTable(
	'metas',
	{
		id: integer('id').primaryKey(),
		mapGroupId: integer('map_group_id')
			.notNull()
			.references(() => mapGroups.id, { onDelete: 'cascade' }),
		tagName: text('tag_name').notNull(),
		name: text('name').notNull(),
		note: text('note').notNull(),
		noteFromPlonkit: integer('note_from_plonkit', { mode: 'boolean' }).notNull().default(false),
		hasImage: integer('has_image', { mode: 'boolean' }).notNull().default(false)
	},
	(t) => ({
		metaUnique: uniqueIndex('metas_unique').on(t.mapGroupId, t.tagName)
	})
);
export const metasRelations = relations(metas, ({ one, many }) => ({
	mapGroup: one(mapGroups, { fields: [metas.mapGroupId], references: [mapGroups.id] }),
	metaLevels: many(metaLevels)
}));

export const metaLevels = sqliteTable(
	'meta_levels',
	{
		id: integer('id').primaryKey(),
		metaId: integer('meta_id')
			.notNull()
			.references(() => metas.id, { onDelete: 'cascade' }),
		levelId: integer('level_id')
			.notNull()
			.references(() => levels.id, { onDelete: 'cascade' })
	},
	(t) => ({
		metaLevelUnique: uniqueIndex('meta_levels_unique').on(t.metaId, t.levelId)
	})
);
export const metaLevelRelations = relations(metaLevels, ({ one }) => ({
	meta: one(metas, { fields: [metaLevels.metaId], references: [metas.id] }),
	level: one(levels, { fields: [metaLevels.levelId], references: [levels.id] })
}));
