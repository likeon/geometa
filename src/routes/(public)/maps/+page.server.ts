import { db } from '$lib/drizzle';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { maps } from '$lib/db/schema';

const officialCacheKey = 'query:maps:official';
const communityCacheKey = 'query:maps:community';

export const load = async (event) => {
  if (event.platform) {
    const officialMapsCachePromise = event.platform.env.geometa_kv.get(officialCacheKey);
    const communityMapsCachePromise = event.platform.env.geometa_kv.get(communityCacheKey);
    const [officialMapsCache, communityMapsCache] = await Promise.all([
      officialMapsCachePromise,
      communityMapsCachePromise
    ]);

    if (officialMapsCache && communityMapsCache) {
      return {
        officialMaps: JSON.parse(officialMapsCache),
        communityMaps: JSON.parse(communityMapsCache)
      };
    }
  }

  const officialMapsPromise = db.query.maps.findMany({
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
  const [officialMaps, communityMaps] = await Promise.all([
    officialMapsPromise,
    communityMapsPromise
  ]);
  if (event.platform) {
    await Promise.all([
      event.platform.env.geometa_kv.put(officialCacheKey, JSON.stringify(officialMaps), {
        expirationTtl: 3600
      }),
      event.platform.env.geometa_kv.put(communityCacheKey, JSON.stringify(communityMaps), {
        expirationTtl: 3600
      })
    ]);
  }
  return { officialMaps, communityMaps };
};
