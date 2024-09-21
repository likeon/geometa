import { text, integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const metaTags = sqliteTable(
	'meta_tags',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull()
	},
	(metaTags) => ({
		nameIdx: uniqueIndex('nameIdx').on(metaTags.name)
	})
);

export const metaEntries = sqliteTable('meta_entries', {
	id: integer('id').primaryKey(),
	type: text('type').notNull(),
	description: text('description').notNull()
});

export const metaEntryTags = sqliteTable('meta_entries_tags', {
	id: integer('id').primaryKey(),
	entry: integer('entry_id').notNull().references(() => metaEntries.id),
	tag: integer('tag_id').notNull().references(() => metaTags.id),
});

export const metaSuggestions = sqliteTable('meta_suggestions', {
	id: integer('id').primaryKey(),
	secret: text('secret').notNull(),
	url: text('url').notNull(),
	description: text('description').notNull(),
	author_nickname: text('author_nickname'),
	status: text('status').default('new'),
});

export const maps = sqliteTable(
	'maps',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		geoguessrId: text('geoguessr_id').notNull(),
	},
	(maps) => ({
		nameIdx: uniqueIndex('maps_nameIdx').on(maps.name),
		geoguessrIdx: uniqueIndex('maps_geoguessrIdx').on(maps.geoguessrId),
	})
);

export const mapsRelations = relations(maps, ({ many }) => ({
  metas: many(mapMetas),
}));

export const mapMetas = sqliteTable(
	'mapMetas',
	{
		id: integer('id').primaryKey(),
		mapId: integer('map_id').notNull().references(() => maps.id),
		type: text('type').notNull(),
		note: text('note').notNull(),
		noteFromPlonkit: integer('note_from_plonkit', { mode: 'boolean' }).notNull().default(false),
		hasImage: integer('has_image', { mode: 'boolean' }).notNull().default(false),
	},
	(mapMeta) => ({
		metaUniqueIdx: uniqueIndex('mapmetas_UniqueIdx').on(mapMeta.mapId, mapMeta.type)
	})
);

export const mapMetasRelations = relations(mapMetas, ({ one }) => ({
  map: one(maps, { fields: [mapMetas.mapId], references: [maps.id] }),
}));