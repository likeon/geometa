import { asc, desc, eq, type InferSelectModel, sql } from 'drizzle-orm';
import { maps, regions } from '$lib/db/schema';
import { Redis } from '@upstash/redis/cloudflare';
import * as privateEnv from '$env/static/private';

let redis: Redis;
if (privateEnv.REDIS_TOKEN) {
  redis = new Redis({
    url: 'https://prepared-flea-35486.upstash.io',
    token: privateEnv.REDIS_TOKEN
  });
}

const mapCacheKey = `${privateEnv.REDIS_KEY_PREFIX ? privateEnv.REDIS_KEY_PREFIX : 'prod'}:query:maps:allmaps`;
const regionsKey = `${privateEnv.REDIS_KEY_PREFIX ? privateEnv.REDIS_KEY_PREFIX : 'prod'}:query:maps:regions`;
const contentCacheEnabled = true;

type Region = InferSelectModel<typeof regions>;
type Map = InferSelectModel<typeof maps> & {
  locationsCount: number;
  regions: string;
  metasCount: number;
};

export const load = async (event) => {
  if (contentCacheEnabled && redis) {
    const allMapsPromise = redis.get(mapCacheKey);
    const regionsPromise = redis.get(regionsKey);
    const [allMapsCache, regionsListCache] = await Promise.all([allMapsPromise, regionsPromise]);
    if (allMapsCache && regionsListCache) {
      return {
        allMaps: allMapsCache as Map[],
        regionsList: regionsListCache as Region[]
      };
    }
  }
  const regionsList = await event.locals.db.select().from(regions).orderBy(asc(regions.ordering));
  const allMaps = await event.locals.db.query.maps.findMany({
    extras: {
      locationsCount: sql<number>`(SELECT COUNT(*)
                                   FROM map_locations_view ml
                                   WHERE ml.map_id = "maps"."id")`.as('locations_count'),
      regions: sql<string>`(SELECT STRING_AGG(r.name, ', ' ORDER BY r.name)
                            FROM map_regions mr
                                   JOIN regions r ON r.id = mr.region_id
                            WHERE mr.map_id = maps.id)`.as('region_names'),
      metasCount: sql<number>`(SELECT COUNT(*)
                               FROM map_metas_view mp
                               WHERE mp.map_id = "maps"."id")`.as('meta_count')
    },
    where: eq(maps.isPublished, true),
    orderBy: [
      sql`"maps"."is_verified" DESC`,
      desc(maps.ordering),
      sql`COALESCE(maps.number_of_games_played_diminished, 0) + FLOOR(RANDOM() * 41) DESC`
    ]
  });

  if (contentCacheEnabled && redis) {
    await Promise.all([
      redis.set(mapCacheKey, JSON.stringify(allMaps), { ex: 3600 }),
      redis.set(regionsKey, JSON.stringify(regionsList), { ex: 3600 })
    ]);
  }
  return { allMaps, regionsList };
};
