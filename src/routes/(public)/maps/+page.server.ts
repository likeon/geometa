import { db } from '$lib/drizzle';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { maps, regions } from '$lib/db/schema';

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
        SELECT STRING_AGG(r.name, ', ' ORDER BY r.name)
        FROM map_regions mr
        JOIN regions r ON r.id = mr.region_id
        WHERE mr.map_id = maps.id
      )`.as('region_names'),
      metasCount: sql<number>`(
        SELECT COUNT(*)
        FROM map_metas_view mp
        WHERE mp.map_id = "maps"."id"
      )`.as('meta_count')
    },
    where: eq(maps.isPublished, true),
    orderBy: [
      sql`"maps"."is_verified" DESC`,
      desc(maps.ordering),
      sql`COALESCE(maps.number_of_games_played_diminished, 0) + FLOOR(RANDOM() * 41) DESC`
    ]
  });

  if (event.platform && contentCacheEnabled) {
    await Promise.all([
      event.platform.env.geometa_kv.put(mapCacheKey, JSON.stringify(allMaps), {
        expirationTtl: 3600
      }),
      event.platform.env.geometa_kv.put(regionsKey, JSON.stringify(regionsList), {
        expirationTtl: 3600
      })
    ]);
  }
  return { allMaps, regionsList };
};
