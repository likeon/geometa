import { db } from '$lib/drizzle';
import { and, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { mapRegions, maps, regions } from '$lib/db/schema';

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
  const regionsPromise = db.select().from(regions).orderBy(asc(regions.ordering));
  const regionsCommunityMapsPromise = db
    .select({
      ...getTableColumns(mapRegions),
      ...getTableColumns(maps),
      locationsCount:
        sql<number>`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
    })
    .from(mapRegions)
    .innerJoin(maps, eq(maps.id, mapRegions.mapId))
    .where(and(eq(maps.isPublished, true), eq(maps.isCommunity, true)))
    .orderBy(
      desc(
        sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
          'locations_count'
        )
      )
    );
  const [officialMaps, regionsList, regionsCommunityMaps] = await Promise.all([
    officialMapsPromise,
    regionsPromise,
    regionsCommunityMapsPromise
  ]);
  const mapsByRegionId = regionsCommunityMaps.reduce(
    (acc: { [key: number]: typeof regionsCommunityMaps }, item) => {
      if (!acc[item.regionId]) {
        acc[item.regionId] = [];
      }
      acc[item.regionId].push(item);
      return acc;
    },
    {}
  );
  const communityMaps = regionsList.map((region) => ({
    region: region,
    maps: mapsByRegionId[region.id]
  }));

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
