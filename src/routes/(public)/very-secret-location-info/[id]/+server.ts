import { getGroupId } from '$routes/(admin)/dev/dash/groups/[id]/utils';
import { db } from '$lib/drizzle';
import { mapLocations, maps } from '$lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { cutToTwoDecimals, getCountryFromTagName } from '$lib/utils';

const headers = new Headers({
  'Content-Type': 'application/json'
});

export async function GET(event) {
  const groupId = getGroupId(event.params);
  const dbValues = await db
    .select()
    .from(mapLocations)
    .innerJoin(maps, eq(mapLocations.mapId, maps.id))
    .where(eq(maps.mapGroupId, groupId))
    .orderBy(asc(maps.id));

  const result = new Map();
  for (const item of dbValues) {
    const key = `${item.maps.geoguessrId}:${cutToTwoDecimals(item.map_locations_view.lat)}:${cutToTwoDecimals(item.map_locations_view.lng)}`;
    const value = {
      country: getCountryFromTagName(item.map_locations_view.tagName),
      metaName: item.map_locations_view.metaName,
      note: item.map_locations_view.metaNote,
      noteFromPlonkit: item.map_locations_view.metaNoteFromPlonkit
    };
    result.set(key, value);
  }

  return new Response(JSON.stringify(Object.fromEntries(result)), { headers });
}
