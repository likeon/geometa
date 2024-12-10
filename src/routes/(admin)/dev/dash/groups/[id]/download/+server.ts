import { db } from '$lib/drizzle';
import { eq } from 'drizzle-orm';
import { mapGroupLocations, mapGroups } from '$lib/db/schema';
import { ensurePermissions } from '$lib/utils';
import { getGroupId } from '../utils';

export async function GET(event) {
  const groupId = getGroupId(event.params);
  await ensurePermissions(event.locals.user?.id, groupId);

  const group = await db.query.mapGroups.findFirst({ where: eq(mapGroups.id, groupId) });

  const locations = await db
    .select()
    .from(mapGroupLocations)
    .where(eq(mapGroupLocations.mapGroupId, groupId));
  const coordinates = locations.map((location) => ({
    lat: location.lat,
    lng: location.lng,
    heading: location.heading,
    pitch: location.pitch,
    zoom: location.zoom,
    panoId: location.panoId,
    countryCode: null,
    stateCode: null,
    extra: {
      tags: [location.extraTag],
      panoDate: location.extraPanoDate,
      panoId: location.extraPanoId
    }
  }));

  const mapData = {
    name: group!.name,
    customCoordinates: coordinates,
    extra: {
      tags: {},
      infoCoordinates: []
    }
  };
  const jsonString = JSON.stringify(mapData);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${group!.name}.json"`
  });

  return new Response(jsonString, {
    headers
  });
}
