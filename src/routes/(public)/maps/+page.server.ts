import { db } from '$lib/drizzle';
import { and, asc, desc, eq, not, sql } from 'drizzle-orm';
import { maps } from '$lib/db/schema';

export const load = async () => {
  // only filter maps from our map group for now(id: 1)

  const mapsToPublish = await db.query.maps.findMany({
    extras: {
      locationsCount:
        sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
    },
    where: and(eq(maps.isPublished, true), eq(maps.mapGroupId, 1)),
    orderBy: [desc(maps.ordering), asc(maps.id)]
  });
  return { mapsToPublish };
};
