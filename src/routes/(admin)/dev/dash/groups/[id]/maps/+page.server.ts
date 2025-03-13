import { getGroupId } from '../utils';
import { and, asc, eq, not, sql } from 'drizzle-orm';
import {
  mapGroups,
  maps,
  levels,
  mapLevels,
  mapFilters,
  users,
  regions,
  mapRegions
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { geoguessrGetMapInfo, markdown2Html } from '$lib/utils';

const insertMapsSchema = createInsertSchema(maps)
  .extend({
    includeFilters: z.array(z.string()),
    excludeFilters: z.array(z.string()),
    levels: z.array(z.number()),
    regions: z.array(z.number()),
    ordering: z.coerce.number(),
    footerNote: z.string()
  })
  .omit({ modifiedAt: true, footerHtml: true });
export type InsertMapsSchema = typeof insertMapsSchema;

export const load = async ({ locals, params }) => {
  const groupId = getGroupId(params);
  const db = locals.db;
  const group = await db.query.mapGroups.findFirst({
    with: {
      maps: {
        extras: {
          locationsCount:
            sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
              'locations_count'
            )
        },
        with: {
          mapLevels: { with: { level: true } },
          mapRegions: { with: { region: true } },
          filters: true
        }
      }
    },
    where: eq(mapGroups.id, groupId)
  });

  if (!group) {
    error(404, 'No group');
  }

  const levelList = await db.query.levels.findMany({ where: eq(levels.mapGroupId, group.id) });
  const regionList = await db.query.regions.findMany({ orderBy: [asc(regions.ordering)] });
  const mapForm = await superValidate(zod(insertMapsSchema));

  const user = await db.query.users.findFirst({ where: eq(users.id, locals.user!.id) });
  if (!user) {
    error(500);
  }
  return { group, levelList, regionList, mapForm, user };
};

export const actions = {
  updateMap: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertMapsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { id, levels, regions, includeFilters, excludeFilters, ...dataNoId } = form.data;
    const combinedFilters = [
      ...includeFilters.map((filter) => ({ name: filter, isExclude: false })),
      ...excludeFilters.map((filter) => ({ name: filter, isExclude: true }))
    ];

    const db = locals.db;
    const user = await db.query.users.findFirst({ where: eq(users.id, locals.user!.id) });
    if (!user) {
      error(500);
    }

    let geoguessrIdChanged: boolean;
    if (id) {
      const savedData = await db.query.maps.findFirst({ where: eq(maps.id, id) });
      geoguessrIdChanged = savedData?.geoguessrId !== dataNoId.geoguessrId;
    } else {
      geoguessrIdChanged = true;
    }

    if (geoguessrIdChanged && !user!.isSuperadmin) {
      const mapInfo = await geoguessrGetMapInfo(dataNoId.geoguessrId);
      if (mapInfo && mapInfo.numberOfGamesPlayed > 10000) {
        return setError(
          form,
          'geoguessrId',
          'This is a popular map which requires additional verification - ask for it in #map-making Discord channel'
        );
      }
    }
    if (!user!.isSuperadmin) {
      // @ts-ignore
      // do not update those if user isn't an admin
      dataNoId.ordering = undefined;
      dataNoId.autoUpdate = undefined;
      dataNoId.isCommunity = !!user!.isTrusted;
      dataNoId.isVerified = undefined;
    }
    if (!user!.isSuperadmin && !user!.isTrusted) {
      dataNoId.isPublished = undefined;
    }

    const footerHtml = await markdown2Html(dataNoId.footer || '');

    let mapId;
    if (id === undefined) {
      const insertResult = await db
        .insert(maps)
        .values({ ...dataNoId, modifiedAt: Math.floor(Date.now() / 1000), footerHtml })
        .returning({ insertedId: maps.id });
      mapId = insertResult[0].insertedId;
    } else {
      await db
        .update(maps)
        .set({ ...dataNoId, modifiedAt: Math.floor(Date.now() / 1000), footerHtml })
        .where(eq(maps.id, id));
      mapId = id;
    }

    // todo: make a method to DRY
    await db
      .delete(mapLevels)
      .where(and(eq(mapLevels.mapId, mapId), not(inArray(mapLevels.levelId, levels))));
    const levelsInsertValues = levels.map((levelId) => ({ levelId: levelId, mapId: mapId }));
    if (levels.length != 0) {
      await db.insert(mapLevels).values(levelsInsertValues).onConflictDoNothing();
    }

    await db.delete(mapFilters).where(
      and(
        eq(mapFilters.mapId, mapId),
        not(
          inArray(
            mapFilters.tagLike,
            combinedFilters.map((filter) => filter.name)
          )
        )
      )
    );
    const filtersInsertValues = combinedFilters.map((filter) => ({
      tagLike: filter.name,
      mapId: mapId,
      isExclude: filter.isExclude
    }));

    if (filtersInsertValues.length != 0) {
      await db.insert(mapFilters).values(filtersInsertValues).onConflictDoNothing();
    }

    if (regions.length != 0) {
      await db
        .insert(mapRegions)
        .values(regions.map((regionId) => ({ mapId: mapId, regionId: regionId })))
        .onConflictDoNothing();
    }

    await db
      .delete(mapRegions)
      .where(and(eq(mapRegions.mapId, mapId), not(inArray(mapRegions.regionId, regions))));
  }
};
