import { maps, syncedLocations, syncedMapMetas } from "@api/lib/db/schema";
import { db } from "@api/lib/drizzle";
import { auth } from "@api/lib/internal/auth";
import { eq, sql, and } from "drizzle-orm";
import { Elysia, t } from "elysia";

export const personalMapsRouter = new Elysia({ prefix: "/personal-maps" }).use(auth()).post(
  "/",
  async ({ userId }) => {
    const personalMaps = await db
      .select({
        id: maps.id,
        name: maps.name,
        geoguessrId: maps.geoguessrId,
        metasCount: sql<number>`COUNT(DISTINCT ${syncedMapMetas.syncedMetaId})`.as("syncedMetasCount"),
        locationsCount: sql<number>`COUNT(${syncedLocations.panoId})`.as("syncedLocationsCount"),
      })
      .from(maps)
      .leftJoin(syncedMapMetas, eq(syncedMapMetas.mapId, maps.id))
      .leftJoin(syncedLocations, eq(syncedLocations.syncedMetaId, syncedMapMetas.syncedMetaId))
      .where(and(eq(maps.userId, userId), eq(maps.isPersonal, true)))
      .groupBy(maps.id, maps.name, maps.geoguessrId);

      return personalMaps;
  },
  {
    userId: true,
    response: {
        200: t.Array(
          t.Object(
            {
              id: t.Integer(),
              name: t.String(),
              geoguessrId: t.String(),
              metasCount: t.Integer(),
              locationsCount: t.Integer()
            },
            { description: 'PersonalMap object' },
          ),
          { description: 'Array of personal maps' },
        ),
      },
  }
);
