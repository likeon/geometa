import { db } from '$lib/drizzle';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { maps } from '$lib/db/schema';

export const load = async () => {
  // only filter maps from our map group for now(id: 1)

  const mapsToPublishPromise = db.query.maps.findMany({
    extras: {
      locationsCount:
        sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
    },
    where: and(eq(maps.isPublished, true), eq(maps.mapGroupId, 1)),
    orderBy: [desc(maps.ordering), asc(maps.id)]
  });
  const communityMapsPromise = db.query.maps.findMany({
    extras: {
      locationsCount:
        sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
    },
    where: and(eq(maps.isPublished, true), eq(maps.isCommunity, true)),
    orderBy: [
      desc(
        sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
      ),
      asc(maps.id)
    ]
  });
  const [mapsToPublish, communityMaps] = await Promise.all([
    mapsToPublishPromise,
    communityMapsPromise
  ]);
  return { mapsToPublish, communityMaps };
};
