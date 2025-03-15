import {
  text,
  integer,
  pgTable,
  uniqueIndex,
  index,
  real,
  pgView,
  boolean,
  timestamp,
  bigserial
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const metaSuggestions = pgTable('meta_suggestions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  secret: text('secret').notNull(),
  url: text('url').notNull(),
  description: text('description').notNull(),
  author_nickname: text('author_nickname'),
  status: text('status').default('new')
});

export const mapGroups = pgTable('map_groups', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  syncedAt: integer('synced_at')
});

export const mapGroupsRelations = relations(mapGroups, ({ many }) => ({
  metas: many(metas),
  maps: many(maps),
  locations: many(mapGroupLocations),
  levels: many(levels),
  permissions: many(mapGroupPermissions)
}));

export const mapGroupLocations = pgTable(
  'map_group_locations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapGroupId: integer('map_group_id')
      .notNull()
      .references(() => mapGroups.id, { onDelete: 'cascade' }),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    heading: real('heading').notNull(),
    pitch: real('pitch').notNull(),
    zoom: real('zoom').notNull(),
    panoId: text('pano_id'),
    extraTag: text('extra_tag').notNull(),
    extraPanoId: text('extra_pano_id'),
    extraPanoDate: text('extra_pano_date'),
    updatedAt: integer('updated_at'),
    modifiedAt: integer('modified_at').default(1730419200).notNull()
  },
  (t) => [
    uniqueIndex('map_group_locations_unique').on(t.mapGroupId, t.panoId),
    index('map_group_locations_map_group_tag_idx').on(t.mapGroupId, t.extraTag)
  ]
);
export const mapGroupLocationsRelations = relations(mapGroupLocations, ({ one }) => ({
  mapGroup: one(mapGroups, { fields: [mapGroupLocations.mapGroupId], references: [mapGroups.id] })
}));

export const maps = pgTable(
  'maps',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapGroupId: integer('map_group_id')
      .notNull()
      .references(() => mapGroups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    geoguessrId: text('geoguessr_id').notNull(),
    description: text('description'),
    isPublished: boolean('is_published').notNull().default(false),
    isCommunity: boolean('is_community').notNull().default(false),
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
  (t) => ({
    geoguessrIdUnique: uniqueIndex('maps_geoguessr_id_unique').on(t.geoguessrId)
  })
);
export const mapsRelations = relations(maps, ({ one, many }) => ({
  mapGroup: one(mapGroups, { fields: [maps.mapGroupId], references: [mapGroups.id] }),
  mapLevels: many(mapLevels),
  filters: many(mapFilters),
  mapRegions: many(mapRegions)
}));

export const levels = pgTable(
  'levels',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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

export const mapLevels = pgTable(
  'map_levels',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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

export const mapFilters = pgTable(
  'map_filters',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    tagLike: text('tag_like'),
    isExclude: boolean('is_exclude').notNull().default(false)
  },
  (t) => ({
    mapFilterUnique: uniqueIndex('map_filters_unique').on(t.mapId, t.tagLike)
  })
);
export const mapFiltersRelations = relations(mapFilters, ({ one }) => ({
  map: one(maps, { fields: [mapFilters.mapId], references: [maps.id] })
}));

export const metas = pgTable(
  'metas',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapGroupId: integer('map_group_id')
      .notNull()
      .references(() => mapGroups.id, { onDelete: 'cascade' }),
    tagName: text('tag_name').notNull(),
    name: text('name').notNull(),
    note: text('note').notNull(),
    noteHtml: text('note_html').notNull().default(''),
    footer: text('footer').notNull().default(''),
    footerHtml: text('footer_html').notNull().default(''),
    noteFromPlonkit: boolean('note_from_plonkit').notNull().default(false),
    hasImage: boolean('has_image').notNull().default(false),
    modifiedAt: integer('modified_at').default(1730419200).notNull()
  },
  (t) => ({
    metaUnique: uniqueIndex('metas_unique').on(t.mapGroupId, t.tagName)
  })
);
export const metasRelations = relations(metas, ({ one, many }) => ({
  mapGroup: one(mapGroups, { fields: [metas.mapGroupId], references: [mapGroups.id] }),
  metaLevels: many(metaLevels),
  images: many(metaImages),
  locationsCount: one(metaLocationsCountView)
}));

export const metaLevels = pgTable(
  'meta_levels',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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

export const metaImages = pgTable(
  'meta_images',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    metaId: integer('meta_id')
      .notNull()
      .references(() => metas.id, { onDelete: 'cascade' }),
    image_url: text('image_url').notNull()
  },
  (t) => ({
    metaImageUnique: uniqueIndex('meta_image_unique').on(t.metaId, t.image_url)
  })
);
export const metaImagesRelations = relations(metaImages, ({ one }) => ({
  meta: one(metas, { fields: [metaImages.metaId], references: [metas.id] })
}));

export const users = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  username: text('username').notNull(),
  isTrusted: boolean('is_trusted').notNull().default(false),
  isSuperadmin: boolean('is_superadmin').notNull().default(false)
});
export const usersRelations = relations(users, ({ many }) => ({
  permissions: many(mapGroupPermissions)
}));

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

export const mapGroupPermissions = pgTable(
  'map_group_permissions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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
export const mapGroupPermissionsRelations = relations(mapGroupPermissions, ({ one }) => ({
  mapGroup: one(mapGroups, {
    fields: [mapGroupPermissions.mapGroupId],
    references: [mapGroups.id]
  }),
  user: one(users, { fields: [mapGroupPermissions.userId], references: [users.id] })
}));

export const mapData = pgTable(
  'map_data',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
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

export const regions = pgTable('regions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  ordering: integer('ordering').notNull().default(0)
});

export const regionsRelations = relations(regions, ({ many }) => ({
  mapRegions: many(mapRegions)
}));

export const mapRegions = pgTable(
  'map_regions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    regionId: integer('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' })
  },
  (t) => ({
    mapRegionUnique: uniqueIndex('map_region_unique').on(t.mapId, t.regionId)
  })
);

export const mapRegionsRelations = relations(mapRegions, ({ one }) => ({
  map: one(maps, { fields: [mapRegions.mapId], references: [maps.id] }),
  region: one(regions, { fields: [mapRegions.regionId], references: [regions.id] })
}));

// --------------
// VIEWS
// --------------
export const locationMetas = pgView('location_metas_view', {
  mapGroupId: integer('map_group_id').notNull(),
  metaId: integer('meta_id').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  heading: real('heading').notNull(),
  pitch: real('pitch').notNull(),
  zoom: real('zoom').notNull(),
  panoId: text('pano_id'),
  extraTag: text('extra_tag').notNull(),
  extraPanoId: text('extra_pano_id'),
  extraPanoDate: text('extra_pano_date').notNull(),
  modifiedAt: integer('modified_at').notNull(),
  metaModifiedAt: integer('meta_modified_at').notNull()
}).existing();

export const mapLocations = pgView('map_locations_view', {
  mapId: integer('map_id').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  heading: real('heading').notNull(),
  pitch: real('pitch').notNull(),
  zoom: real('zoom').notNull(),
  panoId: text('pano_id'),
  metaName: text('meta_name').notNull(),
  extraPanoId: text('extra_pano_id'),
  extraPanoDate: text('extra_pano_date').notNull(),
  tagName: text('tag_name').notNull(),
  metaNote: text('meta_note').notNull(),
  metaNoteHtml: text('meta_note_html').notNull(),
  metaNoteFromPlonkit: boolean('meta_note_from_plonkit').notNull().default(false),
  metaId: integer('meta_id').notNull(),
  modifiedAt: integer('modified_at').notNull(),
  metaModifiedAt: integer('meta_modified_at').notNull(),
  mapModifiedAt: integer('map_modified_at').notNull()
}).existing();

export const mapMetas = pgView('map_metas_view', {
  mapId: integer('map_id').notNull(),
  mapName: text('map_name').notNull(),
  mapFooterHtml: text('map_footer_html').notNull(),
  geoguessrId: text('geoguessr_id').notNull(),
  metaName: text('meta_name').notNull(),
  metaTag: text('meta_tag').notNull(),
  metaNoteHtml: text('meta_note_html').notNull(),
  metaImageUrls: text('meta_image_urls'),
  metaFooterHtml: text('meta_footer_html').notNull(),
  metaNoteFromPlonkit: boolean('meta_note_from_plonkit').notNull()
}).existing();

// actually a view, but views can't have relationship
export const metaLocationsCountView = pgTable('meta_locations_count_view', {
  metaId: integer('meta_id')
    .notNull()
    .references(() => metas.id, { onDelete: 'no action' }),
  total: integer('total').notNull()
});
export const metaLocationsCountViewRelations = relations(metaLocationsCountView, ({ one }) => ({
  meta: one(metas, { fields: [metaLocationsCountView.metaId], references: [metas.id] })
}));
