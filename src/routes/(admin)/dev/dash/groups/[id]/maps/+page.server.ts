import { db } from '$lib/drizzle';
import { getGroupId } from '../utils';
import { and, eq, not, sql } from 'drizzle-orm';
import { mapGroups, maps, levels, metas, metaLevels, mapLevels, mapFilters } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';

const insertMapsSchema = createInsertSchema(maps).extend({
  includeFilters: z.array(z.string()),
  excludeFilters: z.array(z.string()),
  levels: z.array(z.number())
});
export type InsertMapsSchema = typeof insertMapsSchema;

export const load = async ({ params }) => {
  const groupId = getGroupId(params);

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
  const mapForm = await superValidate(zod(insertMapsSchema));

  return { group, levelList, mapForm };
};

export const actions = {
  updateMap: async ({ request }) => {
    const form = await superValidate(request, zod(insertMapsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { id, levels, includeFilters, excludeFilters, ...dataNoId } = form.data;
    const combinedFilters = [
      ...includeFilters.map((filter) => ({ name: filter, isExclude: false })),
      ...excludeFilters.map((filter) => ({ name: filter, isExclude: true }))
    ];

    let mapId;
    if (id === undefined) {
      const insertResult = await db
        .insert(maps)
        .values(dataNoId)
        .returning({ insertedId: maps.id });
      mapId = insertResult[0].insertedId;
    } else {
      await db.update(maps).set(dataNoId).where(eq(maps.id, id));
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
  }
};
