import {
  text,
  integer,
  sqliteTable,
  uniqueIndex,
  blob,
  real,
  sqliteView
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

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
  levels: many(levels)
}));

export const mapGroupLocations = sqliteTable(
  'map_group_locations',
  {
    id: integer('id').primaryKey(),
    mapGroupId: integer('map_group_id')
      .notNull()
      .references(() => mapGroups.id, { onDelete: 'cascade' }),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    heading: real('heading').notNull(),
    pitch: real('pitch').notNull(),
    zoom: integer('zoom').notNull(),
    panoId: text('pano_id'),
    extraTag: text('extra_tag').notNull(),
    extraPanoId: text('extra_pano_id'),
    extraPanoDate: text('extra_pano_date').notNull()
  },
  (t) => ({
    mapLocationUnique: uniqueIndex('map_group_locations_unique').on(t.mapGroupId, t.lat, t.lng)
  })
);
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
    levelId: integer('level_id').references(() => levels.id, { onDelete: 'set null' })
  },
  (t) => ({
    nameUnique: uniqueIndex('maps_name_unique').on(t.name),
    geoguessrIdUnique: uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId)
  })
);
export const mapsRelations = relations(maps, ({ one }) => ({
  mapGroup: one(mapGroups, { fields: [maps.mapGroupId], references: [mapGroups.id] }),
  level: one(levels, { fields: [maps.levelId], references: [levels.id] })
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
export const levelsRelations = relations(levels, ({ one, many }) => ({
  mapGroup: one(mapGroups, { fields: [levels.mapGroupId], references: [mapGroups.id] }),
  metaLevels: many(maps)
}));

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

export const locationMetas = sqliteView('location_metas_view', {
  mapGroupId: integer('map_group_id').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  heading: real('heading').notNull(),
  pitch: real('pitch').notNull(),
  zoom: integer('zoom').notNull(),
  panoId: text('pano_id'),
  extraTag: text('extra_tag').notNull(),
  extraPanoId: text('extra_pano_id'),
  extraPanoDate: text('extra_pano_date').notNull()
}).as(sql`
  SELECT
    mgl.*,
    m.*
  FROM
  ${mapGroupLocations} mgl
    JOIN ${metas} m ON m.tag_name = mgl.extra_tag AND m.map_group_id = mgl.map_group_id
`);

export const mapLocations = sqliteView('map_locations_view', {
  mapId: integer('map_id').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  heading: real('heading').notNull(),
  pitch: real('pitch').notNull(),
  zoom: integer('zoom').notNull(),
  panoId: text('pano_id'),
  metaName: text('meta_name').notNull(),
  extraPanoId: text('extra_pano_id'),
  extraPanoDate: text('extra_pano_date').notNull(),
  tagName: text('tag_name').notNull(),
  metaNote: text('meta_note').notNull(),
  metaNoteFromPlonkit: integer('meta_note_from_plonkit', { mode: 'boolean' }).notNull()
}).as(sql`
  select m.id as map_id, lmv.lat, lmv.lng, lmv.heading, lmv.pitch, lmv.zoom, lmv.pano_id, lmv.meta_name, lmv.extra_pano_id, lmv.extra_pano_date, lmv.extra_tag as tag_name, lmv.meta_note, lmv.meta_note_from_plonkit
  from ${locationMetas} lmv
  join ${metaLevels} ml on ml.meta_id = lmv.meta_id
  join ${levels} l on l.id = ml.level_id
  join ${maps} m on m.map_group_id = lmv.map_group_id and (m.level_id = l.id or m.level_id is null)
`);
