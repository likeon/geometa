import { and, eq } from 'drizzle-orm';
import { maps, mapLocations } from '$lib/db/schema';
import { error } from '@sveltejs/kit';

type Coordinates = {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
  panoId: string | null;
  countryCode: null;
  stateCode: null;
  extra: {
    tags: never[];
    panoDate: string;
    panoId: string | null;
  };
}[];

export async function GET(event) {
  const params = event.params;
  const rawGroupId = params.id;
  const rawMapId = params.mapId;
  const db = event.locals.db;

  if (!rawGroupId || !rawMapId) {
    error(404, 'Invalid url');
  }
  const groupId = parseInt(rawGroupId, 10);
  const mapId = parseInt(rawMapId, 10);

  if (isNaN(mapId) || isNaN(groupId)) {
    error(400, 'Invalid ID');
  }

  const map = await db.query.maps.findFirst({
    where: and(eq(maps.id, mapId), eq(maps.mapGroupId, groupId))
  });

  if (!map) {
    error(404, 'Map not found');
  }

  const locations = await db.select().from(mapLocations).where(eq(mapLocations.mapId, mapId));
  const coordinates: Coordinates = [];
  locations.forEach((locationItem) => {
    const itemData = {
      lat: locationItem.lat,
      lng: locationItem.lng,
      heading: locationItem.heading,
      pitch: locationItem.pitch,
      zoom: locationItem.zoom,
      panoId: locationItem.panoId,
      countryCode: null,
      stateCode: null,
      extra: {
        tags: [],
        panoDate: locationItem.extraPanoDate,
        panoId: locationItem.extraPanoId
      }
    };
    coordinates.push(itemData);
  });

  const mapData = {
    name: map.name,
    customCoordinates: coordinates,
    extra: {
      tags: {},
      infoCoordinates: []
    }
  };
  const jsonString = JSON.stringify(mapData);

  // Set response headers to prompt file download
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${map.name}.json"`
  });

  // Return the response
  return new Response(jsonString, {
    headers
  });
}
