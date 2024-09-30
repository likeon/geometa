import { db } from '$lib/drizzle';
import { getGroupId } from '../utils';
import { eq, sql } from 'drizzle-orm';
import { mapGroups, maps, levels } from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

const insertMapsSchema = createInsertSchema(maps).extend({ filters: z.array(z.string()) });
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
          level: true
        }
      }
    },
    where: eq(mapGroups.id, groupId)
  });

  if (!group) {
    error(404, 'No group');
  }

  const levelList = await db.query.levels.findMany({ where: eq(levels.mapGroupId, group?.id) });
  const mapForm = await superValidate(zod(insertMapsSchema));

  return { group, levelList, mapForm };
};

export const actions = {
  updateMap: async ({ request }) => {
    const form = await superValidate(request, zod(insertMapsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    form.data.levelId = form.data.levelId == -1 ? null : form.data.levelId;
    const { id, ...dataNoId } = form.data;
    let mapId;
    // temporary: check if filters data is properly received
    console.log(form.data.filters);
    if (id === undefined) {
      const insertResult = await db
        .insert(maps)
        .values(form.data)
        .returning({ insertedId: maps.id });
      mapId = insertResult[0].insertedId;
    } else {
      await db.update(maps).set(dataNoId).where(eq(maps.id, id));
      mapId = id;
    }
  }
};
