import { db } from '$lib/drizzle';
import { and, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { mapRegions, maps, regions } from '$lib/db/schema';

const mapCacheKey = 'query:maps:allmaps';
const regionsKey = 'query:maps:regions';
const contentCacheEnabled = false;

export const load = async (event) => {
  if (event.platform && contentCacheEnabled) {
    const allMapsPromise = event.platform.env.geometa_kv.get(mapCacheKey);
    const regionsPromise = event.platform.env.geometa_kv.get(regionsKey);
    const [allMapsCache, regionsListCache] = await Promise.all([allMapsPromise, regionsPromise]);

    if (allMapsCache && regionsListCache) {
      return {
        allMaps: JSON.parse(allMapsCache),
        regionsList: JSON.parse(regionsListCache)
      };
    }
  }
  const regionsList = await db.select().from(regions).orderBy(asc(regions.ordering));
  const allMaps = await db.query.maps.findMany({
    extras: {
      locationsCount: sql<number>`(
        SELECT COUNT(*)
        FROM map_locations_view ml
        WHERE ml.map_id = "maps"."id"
      )`.as('locations_count'),
      regions: sql<string>`(
        SELECT GROUP_CONCAT(r.name, ', ')
        FROM map_regions mr
        JOIN regions r ON r.id = mr.region_id
        WHERE mr.map_id = "maps"."id"
      )`.as('region_names'),
      metasCount: sql<number>`(
        SELECT COUNT(*)
        FROM map_metas_view mp
        WHERE mp.map_id = "maps"."id"
      )`.as('meta_count')
    },
    where: eq(maps.isPublished, true),
    orderBy: [sql`CASE WHEN "maps"."is_verified" THEN 1 ELSE 0 END DESC`, desc(maps.ordering)]
  });

  if (event.platform && contentCacheEnabled) {
    await Promise.all([
      event.platform.env.geometa_kv.put(mapCacheKey, JSON.stringify(allMaps), {
        expirationTtl: 3600
      }),
      event.platform.env.geometa_kv.put(regionsKey, JSON.stringify(regionsKey), {
        expirationTtl: 3600
      })
    ]);
  }
  return { allMaps, regionsList };
};
