import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { and, asc, eq, not, notInArray, sql } from 'drizzle-orm';
import {
  levels,
  mapGroupLocations,
  mapLocations,
  mapGroups,
  metaImages,
  metaLevels,
  metas,
  maps,
  mapData
} from '$lib/db/schema';
import { error, fail } from '@sveltejs/kit';
import { createInsertSchema } from 'drizzle-zod';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import {
  ensurePermissions,
  extractJsonData,
  generateRandomString,
  getFileExtension
} from '$lib/utils';
import { getGroupId } from './utils';
import { uploadFile } from '$lib/s3';
import { dev } from '$app/environment';
import { syncUserScriptData } from '$lib/user-script';
import { env } from '$env/dynamic/private';

const insertMetasSchema = createInsertSchema(metas)
  .extend({ levels: z.array(z.number()) })
  .omit({ noteFromPlonkit: true, hasImage: true });
export type InsertMetasSchema = typeof insertMetasSchema;

const mapUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' })
});
export type MapUploadSchema = typeof mapUploadSchema;

const imageUploadSchema = z.object({
  metaId: z.number(),
  file: z.instanceof(File, { message: 'Please upload an image' })
});
export type ImageUploadSchema = typeof imageUploadSchema;

const mapJsonSchema = z.object({
  customCoordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
      heading: z.number(),
      pitch: z.number(),
      zoom: z.number(),
      panoId: z.string().optional().or(z.null()),
      extra: z.object({
        tags: z.string().array().length(1),
        panoId: z.string().optional(),
        panoDate: z.string().optional().or(z.null())
      })
    })
    .array()
});
type UpsertValue = {
  mapGroupId: number;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
  panoId: string | null;
  extraTag: string;
  extraPanoId: string | null;
  extraPanoDate: string | null | undefined;
};

export const load: PageServerLoad = async ({ params, locals }) => {
  const id = getGroupId(params);
  await ensurePermissions(locals.user?.id, id);
  const group = await db.query.mapGroups.findFirst({
    with: {
      metas: {
        orderBy: [asc(metas.id)],
        with: { metaLevels: { with: { level: true } }, images: true },
        extras: {
          locationsCount:
            sql`(select count(*) from location_metas_view lm where lm.meta_id = ${metas.id})`.as(
              'locations_count'
            )
        }
      }
    },
    where: eq(mapGroups.id, id)
  });

  if (!group) {
    error(404, 'No group');
  }
  const levelList = await db.query.levels.findMany({ where: eq(levels.mapGroupId, group?.id) });

  const metaForm = await superValidate(zod(insertMetasSchema));
  const mapUploadForm = await superValidate(zod(mapUploadSchema));
  const imageUploadForm = await superValidate(zod(imageUploadSchema));

  return {
    group,
    metaForm,
    levelList,
    mapUploadForm,
    imageUploadForm
  };
};

export const actions = {
  updateMeta: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertMetasSchema));

    if (!form.valid) {
      return fail(400, { form });
    }
    await ensurePermissions(locals.user?.id, form.data.mapGroupId);

    const { id, levels, ...dataNoId } = form.data;
    let metaId;

    if (id === undefined) {
      const insertResult = await db
        .insert(metas)
        .values(form.data)
        .returning({ insertedId: metas.id });
      metaId = insertResult[0].insertedId;
    } else {
      const savedData = await db.query.metas.findFirst({ where: eq(metas.id, id) });
      await ensurePermissions(locals.user?.id, savedData?.mapGroupId);
      await db.update(metas).set(dataNoId).where(eq(metas.id, id));
      metaId = id;
    }

    await db
      .delete(metaLevels)
      .where(and(eq(metaLevels.metaId, metaId), not(inArray(metaLevels.levelId, levels))));
    const levelsInsertValues = levels.map((levelId) => ({ levelId: levelId, metaId: metaId }));
    if (levelsInsertValues.length != 0) {
      await db.insert(metaLevels).values(levelsInsertValues).onConflictDoNothing();
    }
  },
  deleteMeta: async ({ request, locals }) => {
    const data = await request.formData();
    const metaId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(metaId)) {
      error(400, 'Invalid ID');
    }

    const meta = await db.query.metas.findFirst({ where: eq(metas.id, metaId) });
    await ensurePermissions(locals.user?.id, meta?.mapGroupId);

    await db.delete(metas).where(eq(metas.id, metaId));
  },
  uploadMapJson: async ({ request, params, locals }) => {
    const groupId = getGroupId(params);
    await ensurePermissions(locals.user?.id, groupId);
    const form = await superValidate(request, zod(mapUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }

    const jsonData = await extractJsonData(form.data.file);
    const validationResult = mapJsonSchema.safeParse(jsonData);

    if (!validationResult.success) {
      return setError(form, 'file', "JSON doesn't match the expected format");
    }

    const upsertValues: UpsertValue[] = [];
    const usedTags = new Set<string>();
    validationResult.data.customCoordinates.forEach((location) => {
      upsertValues.push({
        mapGroupId: groupId,
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        pitch: location.pitch,
        zoom: location.zoom,
        panoId: location.panoId || null,
        extraTag: location.extra.tags[0],
        extraPanoId: location.extra.panoId || null,
        extraPanoDate: location.extra.panoDate
      });
      usedTags.add(location.extra.tags[0]);
    });

    // upsert data
    const upsertResult = await db
      .insert(mapGroupLocations)
      .values(upsertValues)
      .onConflictDoUpdate({
        target: [mapGroupLocations.mapGroupId, mapGroupLocations.lat, mapGroupLocations.lng],
        set: {
          heading: sql`excluded.heading`,
          pitch: sql`excluded.pitch`,
          zoom: sql`excluded.zoom`,
          panoId: sql`excluded.pano_id`,
          extraTag: sql`excluded.extra_tag`,
          extraPanoId: sql`excluded.extra_pano_id`,
          extraPanoDate: sql`excluded.extra_pano_date`
        }
      })
      .returning({ id: mapGroupLocations.id });

    // delete rows that weren't updated
    await db.delete(mapGroupLocations).where(
      and(
        eq(mapGroupLocations.mapGroupId, groupId),
        notInArray(
          mapGroupLocations.id,
          upsertResult.map((item) => item.id)
        )
      )
    );

    // upsert tag names into metas
    const metaInsertValues = Array.from(usedTags).map((tagName) => ({
      mapGroupId: groupId,
      tagName: tagName,
      name: '',
      note: ''
    }));
    await db.insert(metas).values(metaInsertValues).onConflictDoNothing();
  },
  uploadMetaImages: async ({ request, locals }) => {
    const form = await superValidate(request, zod(imageUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    const meta = await db.query.metas.findFirst({ where: eq(metas.id, form.data.metaId) });
    await ensurePermissions(locals.user?.id, meta?.mapGroupId);

    const imageName = `${generateRandomString(36)}.${getFileExtension(form.data.file)}`;
    await uploadFile(form.data.file, imageName);

    const url = `https://static${dev ? '-dev' : ''}.learnablemeta.com/${imageName}`;

    const result = await db
      .insert(metaImages)
      .values({ metaId: form.data.metaId, image_url: url })
      .returning({ id: metaImages.id, metaId: metaImages.metaId, image_url: metaImages.image_url });
    return message(form, result[0]);
  },
  deleteMetaImage: async ({ request, locals }) => {
    const data = await request.formData();
    const imageId = parseInt((data.get('imageId') as string) || '', 10);
    if (isNaN(imageId)) {
      error(400, 'Invalid ID');
    }
    const savedImage = await db
      .select()
      .from(metaImages)
      .innerJoin(metas, eq(metas.id, metaImages.metaId))
      .where(eq(metaImages.id, imageId));
    await ensurePermissions(locals.user?.id, savedImage[0]?.metas.mapGroupId);

    await db.delete(metaImages).where(eq(metaImages.id, imageId));
    return { success: true, imageId: imageId };
  },
  prepareUserScriptData: async (event) => {
    const groupId = getGroupId(event.params);
    await ensurePermissions(event.locals.user?.id, groupId);

    if (event.platform === undefined) {
      error(500, 'platform unavailable');
    }

    try {
      await syncUserScriptData(groupId, event.platform.env.geometa_kv);
      const TRAUSI_GROUP_ID = 1;
      let updateCount = 0;
      if (groupId == TRAUSI_GROUP_ID) {
        updateCount = await autoUpdateMaps(TRAUSI_GROUP_ID);
      }

      return {
        status: 200,
        updateCount
      };
    } catch (err) {
      const errorMessage = (err as Error).message || 'An error occurred';
      const errorStatus = (err as { status?: number }).status || 500;
      throw error(errorStatus, errorMessage);
    }
  }
};

async function autoUpdateMaps(mapGroupId: number) {
  const mapsToUpdateData = await db
    .select({
      mapId: maps.id,
      geoguessrId: maps.geoguessrId,
      lastUpdatedPanoids: mapData.lastUpdatedPanoids
    })
    .from(maps)
    .leftJoin(mapData, eq(mapData.mapId, maps.id))
    .where(and(eq(maps.autoUpdate, true), eq(maps.mapGroupId, mapGroupId)));

  // not sure why db query is returning lastUpdatedPanoids as single string
  const mapsToUpdate = mapsToUpdateData.map((map) => ({
    mapId: map.mapId,
    geoguessrId: map.geoguessrId,
    lastUpdatedPanoids: map.lastUpdatedPanoids ? map.lastUpdatedPanoids.toString().split(',') : []
  }));

  let updateCount = 0;
  for (const map of mapsToUpdate) {
    const currentLocations = await db
      .select()
      .from(mapLocations)
      .where(eq(mapLocations.mapId, map.mapId));

    // if there is not map data save update map since it was never updated
    if (map.lastUpdatedPanoids == null) {
      await updateMap(map.mapId, map.geoguessrId, currentLocations);
      updateCount++;
      continue;
    }

    // if location count is different map for sure has to be updated
    if (currentLocations.length != map.lastUpdatedPanoids.length) {
      await updateMap(map.mapId, map.geoguessrId, currentLocations);
      updateCount++;
      continue;
    }

    const lastUpdatedPanoidsSet = new Set(map.lastUpdatedPanoids);
    for (const loc of currentLocations) {
      if (!lastUpdatedPanoidsSet.has(loc.panoId!)) {
        await updateMap(map.mapId, map.geoguessrId, currentLocations);
        updateCount++;
        break;
      }
    }
  }
  return updateCount;
}

async function updateMap(
  mapId: number,
  geoguessrId: string,
  locations: {
    tagName: string;
    metaId: number;
    lat: number;
    lng: number;
    heading: number;
    pitch: number;
    zoom: number;
    panoId: string | null;
    extraPanoId: string | null;
    extraPanoDate: string;
    mapId: number;
    metaName: string;
    metaNote: string;
    metaNoteFromPlonkit: boolean;
  }[]
) {
  const locationsToUpload = locations.map((loc) => {
    return {
      lat: loc.lat,
      lng: loc.lng,
      heading: loc.heading,
      pitch: loc.pitch,
      zoom: loc.zoom,
      panoId: loc.panoId,
      countryCode: null,
      stateCode: null
    };
  });

  const apiUrl = `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;
  const ncfaToken = env.NFCA_TOKEN || null;

  if (ncfaToken == null) {
    throw new Error('NFCA_TOKEN IS MISSING');
  }

  const headers = {
    Cookie: `_ncfa=${ncfaToken}`,
    'Content-Type': 'application/json'
  };

  // GET request to fetch the map draft
  const response = await fetch(`${apiUrl}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch the map draft');

  const data = await response.json();
  const { avatar, description, highlighted, name } = data;
  const mapDataToUpload = {
    avatar,
    description,
    highlighted,
    name,
    customCoordinates: locationsToUpload
  };

  // PUT request to update the map draft
  const updateResponse = await fetch(`${apiUrl}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(mapDataToUpload)
  });

  if (!updateResponse.ok) throw error(updateResponse.status, 'Failed to update the map draft');

  const publishResponse = await fetch(`${apiUrl}/publish`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({})
  });

  if (!publishResponse.ok) throw error(publishResponse.status, 'Failed to publish the map');

  // assign empty string if its null(shouldnt be when we force it to be not null later so should change that when we do that)
  const currentPanoids = locationsToUpload.map((loc) => loc.panoId || '');
  await db
    .insert(mapData)
    .values({
      mapId: mapId,
      lastUpdatedPanoids: currentPanoids
    })
    .onConflictDoUpdate({
      target: [mapData.mapId],
      set: { lastUpdatedPanoids: currentPanoids }
    });
}
