import { error } from '@sveltejs/kit';
import { mapData, mapLocations, maps } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { geoguessrAPIFetch } from '$lib/utils';
import type { DB } from '$lib/drizzle';

export async function geo(
  db: DB,
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
  console.debug('IN geo updating function');
  const apiUrl = `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;

  // GET request to fetch the map draft
  const response = await geoguessrAPIFetch(apiUrl);
  if (!response.ok) throw new Error('Failed to fetch the map draft');
  console.debug('IN geo updating function - after map draft request');
  const data = await response.json();
  const { avatar, description, highlighted, name, version } = data;
  const mapDataToUpload = {
    avatar,
    description,
    highlighted,
    name,
    customCoordinates: locationsToUpload,
    version: version + 1
  };

  // PUT request to update the map draft
  const updateResponse = await geoguessrAPIFetch(apiUrl, {
    method: 'PUT',
    body: JSON.stringify(mapDataToUpload)
  });

  console.debug('IN geo updating function - after mrequerst to update map draft');

  if (!updateResponse.ok) throw error(updateResponse.status, 'Failed to update the map draft');

  const publishResponse = await geoguessrAPIFetch(`${apiUrl}/publish`, {
    method: 'PUT',
    body: JSON.stringify({})
  });
  console.debug('IN geo updating function - after trying to publish map');
  if (!publishResponse.ok) throw error(publishResponse.status, 'Failed to publish the map');

  console.debug('IN geo updating function after all network requests');
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

export async function autoUpdateMaps(db: DB, mapGroupId: number) {
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
  console.debug('before checking which maps to update');
  for (const map of mapsToUpdate) {
    const currentLocations = await db
      .select()
      .from(mapLocations)
      .where(eq(mapLocations.mapId, map.mapId));

    // if there is not map data save update map since it was never updated
    if (map.lastUpdatedPanoids == null) {
      await geo(db, map.mapId, map.geoguessrId, currentLocations);
      updateCount++;
      continue;
    }

    // if location count is different map for sure has to be updated
    if (currentLocations.length != map.lastUpdatedPanoids.length) {
      await geo(db, map.mapId, map.geoguessrId, currentLocations);
      updateCount++;
      continue;
    }

    const lastUpdatedPanoidsSet = new Set(map.lastUpdatedPanoids);
    for (const loc of currentLocations) {
      if (!lastUpdatedPanoidsSet.has(loc.panoId!)) {
        await geo(db, map.mapId, map.geoguessrId, currentLocations);
        updateCount++;
        break;
      }
    }
  }
  return updateCount;
}
