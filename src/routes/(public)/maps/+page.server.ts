import { db } from '$lib/drizzle';
import { and, eq, not, sql } from 'drizzle-orm';
import { maps } from '$lib/db/schema';

export const load = async () => {
  // only filter maps from our map group for now(id: 1)

  const mapsToPublish = await db.query.maps.findMany({
    where: and(eq(maps.isPublished, true), eq(maps.mapGroupId, 1))
  });
  return { mapsToPublish };
};
