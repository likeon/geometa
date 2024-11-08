import { text, integer, sqliteTable, uniqueIndex, real, sqliteView } from 'drizzle-orm/sqlite-core';
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
  name: text('name').notNull(),
  syncedAt: integer('synced_at')
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
    extraPanoDate: text('extra_pano_date'),
    updatedAt: integer('updated_at'),
    modifiedAt: integer('modified_at').default(1730419200).notNull()
  },
  (t) => ({
    mapLocationUnique: uniqueIndex('map_group_locations_unique').on(t.mapGroupId, t.panoId)
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
    description: text('description'),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    isCommunity: integer('is_community', { mode: 'boolean' }).notNull().default(false),
    authors: text('authors').default(''),
    ordering: integer('ordering').notNull().default(0),
    autoUpdate: integer('auto_update', { mode: 'boolean' }).notNull().default(false)
  },
  (t) => ({
    nameUnique: uniqueIndex('maps_name_unique').on(t.name),
    geoguessrIdUnique: uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId)
  })
);
export const mapsRelations = relations(maps, ({ one, many }) => ({
  mapGroup: one(mapGroups, { fields: [maps.mapGroupId], references: [mapGroups.id] }),
  mapLevels: many(mapLevels),
  filters: many(mapFilters)
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

export const mapLevels = sqliteTable(
  'map_levels',
  {
    id: integer('id').primaryKey(),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    levelId: integer('level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'cascade' })
  },
  (t) => ({
    mapLevelUnique: uniqueIndex('map_levels_unique').on(t.mapId, t.levelId)
  })
);
export const mapLevelRelations = relations(mapLevels, ({ one }) => ({
  map: one(maps, { fields: [mapLevels.mapId], references: [maps.id] }),
  level: one(levels, { fields: [mapLevels.levelId], references: [levels.id] })
}));

export const mapFilters = sqliteTable(
  'map_filters',
  {
    id: integer('id').primaryKey(),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    tagLike: text('tag_like'),
    isExclude: integer('is_exclude', { mode: 'boolean' }).notNull().default(false)
  },
  (t) => ({
    mapFilterUnique: uniqueIndex('map_filters_unique').on(t.mapId, t.tagLike)
  })
);
export const mapFiltersRelations = relations(mapFilters, ({ one }) => ({
  map: one(maps, { fields: [mapFilters.mapId], references: [maps.id] })
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
    noteHtml: text('note_html').notNull().default(''),
    noteFromPlonkit: integer('note_from_plonkit', { mode: 'boolean' }).notNull().default(false),
    hasImage: integer('has_image', { mode: 'boolean' }).notNull().default(false),
    modifiedAt: integer('modified_at').default(1730419200).notNull()
  },
  (t) => ({
    metaUnique: uniqueIndex('metas_unique').on(t.mapGroupId, t.tagName)
  })
);
export const metasRelations = relations(metas, ({ one, many }) => ({
  mapGroup: one(mapGroups, { fields: [metas.mapGroupId], references: [mapGroups.id] }),
  metaLevels: many(metaLevels),
  images: many(metaImages)
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

export const metaImages = sqliteTable('meta_images', {
  id: integer('id').primaryKey(),
  metaId: integer('meta_id')
    .notNull()
    .references(() => metas.id, { onDelete: 'cascade' }),
  image_url: text('image_url').notNull()
});
export const metaImagesRelations = relations(metaImages, ({ one }) => ({
  meta: one(metas, { fields: [metaImages.metaId], references: [metas.id] })
}));

export const locationMetas = sqliteView('location_metas_view', {
  mapGroupId: integer('map_group_id').notNull(),
  metaId: integer('meta_id').notNull(),
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
  metaNoteHtml: text('meta_note_html').notNull(),
  metaNoteFromPlonkit: integer('meta_note_from_plonkit', { mode: 'boolean' }).notNull(),
  metaId: integer('meta_id').notNull(),
  maxModifiedAt: integer('max_modified_at').notNull()
}).as(sql`
  SELECT
    m.id          AS map_id,
    lmv.lat,
    lmv.lng,
    lmv.heading,
    lmv.pitch,
    lmv.zoom,
    lmv.pano_id,
    lmv.meta_name,
    lmv.extra_pano_id,
    lmv.extra_pano_date,
    lmv.extra_tag AS tag_name,
    lmv.meta_note,
    lmv.meta_note_html,
    lmv.meta_note_from_plonkit
  FROM
    ${locationMetas} lmv
      JOIN ${metaLevels} ml ON ml.meta_id = lmv.meta_id
      JOIN ${levels} l ON l.id = ml.level_id
      JOIN ${maps} m ON m.map_group_id = lmv.map_group_id AND (m.level_id = l.id OR m.level_id IS NULL)
`);

export const users = sqliteTable('user', {
  id: text('id').notNull().primaryKey(),
  username: text('username').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isSuperadmin: integer('is_superadmin', { mode: 'boolean' }).notNull().default(false)
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at').notNull()
});

export const mapGroupPermissions = sqliteTable(
  'map_group_permissions',
  {
    id: integer('id').primaryKey(),
    mapGroupId: integer('map_group_id')
      .notNull()
      .references(() => mapGroups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (t) => ({
    mapGroupPermissionsUnique: uniqueIndex('map_group_permissions_unique').on(
      t.mapGroupId,
      t.userId
    )
  })
);

export const mapData = sqliteTable(
  'map_data',
  {
    id: integer('id').primaryKey(),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    lastUpdatedPanoids: text('last_updated_panoids')
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'`)
  },
  (t) => ({
    mapDataUnique: uniqueIndex('map_data_unique').on(t.mapId)
  })
);

export const mapDataRelations = relations(mapData, ({ one }) => ({
  map: one(maps, { fields: [mapData.mapId], references: [maps.id] })
}));
