import { cacheTable, maps, regions } from '$lib/db/schema';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/drizzle';

const cacheKey = 'queries:mapsPage';

export async function getDbData() {
  const db = getDb();
  const regionsListPromise = db.select().from(regions).orderBy(asc(regions.ordering));
  const allMapsPromise = db.query.maps.findMany({
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
  const [regionsList, allMaps] = await Promise.all([regionsListPromise, allMapsPromise]);
  return { regionsList, allMaps };
}
type DbData = Awaited<ReturnType<typeof getDbData>>;

export async function updateCache(data: DbData) {
  await getDb()
    .insert(cacheTable)
    .values({ key: cacheKey, value: JSON.stringify(data) })
    .onConflictDoUpdate({
      target: [cacheTable.key],
      set: {
        value: sql`excluded.value`
      }
    });
}

export async function getData() {
  const cachedData = await getDb().query.cacheTable.findFirst({
    where: eq(cacheTable.key, cacheKey)
  });
  if (cachedData) {
    return JSON.parse(cachedData.value) as DbData;
  }
  const dbData = await getDbData();
  updateCache(dbData);
  return dbData;
}
