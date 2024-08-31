import { text, integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
