import { text, integer, sqliteTable, uniqueIndex, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const metaSuggestions = sqliteTable('meta_suggestions', {
	id: integer('id').primaryKey(),
	secret: text('secret').notNull(),
	url: text('url').notNull(),
	description: text('description').notNull(),
	author_nickname: text('author_nickname'),
	status: text('status').default('new'),
});

export const mapGroups = sqliteTable(
	'map_groups',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
    data: blob('data'),
	}
);

export const mapGroupsRelations = relations(mapGroups, ({ many }) => ({
  metas: many(metas),
  maps: many(maps),
}));

export const metas = sqliteTable(
	'metas',
	{
		id: integer('id').primaryKey(),
		mapGroupId: integer('map_group_id').notNull().references(() => mapGroups.id),
		tagName: text('tag_name').notNull(),
		name: text('name').notNull(),
		note: text('note').notNull(),
		noteFromPlonkit: integer('note_from_plonkit', { mode: 'boolean' }).notNull().default(false),
		hasImage: integer('has_image', { mode: 'boolean' }).notNull().default(false),
    level: integer('level').notNull().default(10)
	},
	(t) => ({
		metaUnique: uniqueIndex('metas_unique').on(t.mapGroupId, t.tagName)
	})
);
export const metasRelations = relations(metas, ({ one }) => ({
  mapGroup: one(mapGroups, { fields: [metas.mapGroupId], references: [mapGroups.id] }),
}));

export const maps = sqliteTable(
	'maps',
	{
		id: integer('id').primaryKey(),
    mapGroupId: integer('map_group_id').notNull().references(() => mapGroups.id),
		name: text('name').notNull(),
		geoguessrId: text('geoguessr_id').notNull(),
    filters: blob('filters'),
	},
	(t) => ({
		nameUnique: uniqueIndex('maps_name_unique').on(t.name),
		geoguessrIdUnique: uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId),
	})
);
export const mapsRelations = relations(maps, ({ one }) => ({
  mapGroup: one(mapGroups, { fields: [maps.mapGroupId], references: [mapGroups.id] }),
}));
