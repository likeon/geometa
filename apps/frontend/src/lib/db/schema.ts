// Trimmed schema: business data now lives behind the API (apps/api owns the
// canonical schema and migrations). Only the tables still accessed directly by
// the frontend remain: Lucia auth (user/session), the maps-page cache and the
// cronjob endpoints (maps/regions/cache).
import {
  text,
  integer,
  pgTable,
  uniqueIndex,
  index,
  boolean,
  timestamp,
  bigserial
} from 'drizzle-orm/pg-core';

export const users = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  username: text('username').notNull(),
  isTrusted: boolean('is_trusted').notNull().default(false),
  isSuperadmin: boolean('is_superadmin').notNull().default(false),
  apiToken: text('api_token').unique()
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull()
});

export const maps = pgTable(
  'maps',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapGroupId: integer('map_group_id'),
    name: text('name').notNull(),
    geoguessrId: text('geoguessr_id').notNull(),
    description: text('description'),
    isPublished: boolean('is_published').notNull().default(false),
    isShared: boolean('is_shared').notNull().default(false),
    isPersonal: boolean('is_personal').notNull().default(false),
    // only for personal maps
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    authors: text('authors').default(''),
    ordering: integer('ordering').notNull().default(0),
    autoUpdate: boolean('auto_update').notNull().default(false),
    footer: text('footer').notNull().default(''),
    footerHtml: text('footer_html').notNull().default(''),
    modifiedAt: integer('modified_at').default(1730419200).notNull(),
    difficulty: integer('difficulty').notNull().default(0),
    isVerified: boolean('is_verified').notNull().default(false),
    numberOfGamesPlayed: integer('number_of_games_played'),
    numberOfGamesPlayedDiminished: integer('number_of_games_played_diminished')
  },
  (t) => [
    uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId),
    index('maps_map_group_modified_idx').on(t.mapGroupId, t.modifiedAt)
  ]
);

export const regions = pgTable('regions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  ordering: integer('ordering').notNull().default(0)
});

export const cacheTable = pgTable(
  'cache',
  {
    key: text('key').notNull(),
    value: text('value').notNull()
  },
  (t) => ({
    keyUnique: uniqueIndex('cache_key_unique').on(t.key)
    // todo: use after drizzle upgraded
    // keyHash: index('cache_key_hash_idx').on(t.key).using('hash')
  })
);
