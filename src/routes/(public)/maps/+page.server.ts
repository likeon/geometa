import { asc, desc, eq, sql } from 'drizzle-orm';
import { maps, regions } from '$lib/db/schema';

export const load = async (event) => {
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
  return { allMaps, regionsList };
};
