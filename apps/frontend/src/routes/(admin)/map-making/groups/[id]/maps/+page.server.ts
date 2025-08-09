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
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { ensurePermissions, geoguessrGetMapInfo, markdown2Html } from '$lib/utils';
import { insertMapsSchema } from '$lib/form-schema';

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
            ),
          metasCount:
            sql`(select count(distinct ml.meta_id) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
              'metas_count'
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
  deleteMap: async ({ request, locals }) => {
    const data = await request.formData();
    const mapId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(mapId)) {
      error(400, 'Invalid ID');
    }

    const map = await locals.db.query.maps.findFirst({ where: eq(maps.id, mapId) });
    await ensurePermissions(locals.db, locals.user?.id, map?.mapGroupId);

    await locals.db.delete(maps).where(eq(maps.id, mapId));
  },

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
    const footerHtml = await markdown2Html(dataNoId.footer || '');
    const baseValues = {
      mapGroupId: dataNoId.mapGroupId,
      name: dataNoId.name,
      geoguessrId: dataNoId.geoguessrId,
      description: dataNoId.description,
      isShared: dataNoId.isShared,
      authors: dataNoId.authors,
      footer: dataNoId.footer,
      difficulty: dataNoId.difficulty,
      modifiedAt: Math.floor(Date.now() / 1000),
      footerHtml
    };

    const values = {
      ...baseValues,
      ...(user!.isSuperadmin && {
        ordering: dataNoId.ordering,
        autoUpdate: dataNoId.autoUpdate,
        isVerified: dataNoId.isVerified
      }),
      ...((user!.isSuperadmin || user!.isTrusted) && {
        isPublished: dataNoId.isPublished
      })
    };

    let mapId;
    try {
      if (id === undefined) {
        const insertResult = await db
          .insert(maps)
          .values({ ...values, modifiedAt: Math.floor(Date.now() / 1000) })
          .returning({ insertedId: maps.id });
        mapId = insertResult[0].insertedId;
      } else {
        await db
          .update(maps)
          .set({ ...values, modifiedAt: Math.floor(Date.now() / 1000) })
          .where(eq(maps.id, id));
        mapId = id;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === '23505' && error.constraint_name === 'maps_geoguessr_id_unique') {
        return setError(
          form,
          'geoguessrId',
          'This GeoGuessr ID is already used by another map. Please use a different ID.'
        );
      }

      // Log the error for debugging
      console.error('Error updating/creating map:', error);

      // Return a general error message
      return message(form, 'Something went wrong while saving the map. Please try again.', {
        status: 500
      });
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
