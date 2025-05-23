import { maps, syncedLocations, syncedMapMetas } from "@api/lib/db/schema";
import { db } from "@api/lib/drizzle";
import { auth } from "@api/lib/internal/auth";
import { eq, sql, and } from "drizzle-orm";
import { Elysia, t } from "elysia";

export const personalMapsRouter = new Elysia({ prefix: "/personal-maps" }).use(auth()).get(
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
)
.post("/",
  async ({ userId,body,set}) => {
     const { name, geoguessrId } = body;
    // TODO: add checking if geoguessrID is popular map and if its valid
     try {
      const result = await db.insert(maps).values({
        name,
        geoguessrId,
        userId,
        isPersonal: true,
      }).returning({ id: maps.id });

      return { id: result[0].id };
    } catch (e) {
      if (
        e instanceof Error &&
        'message' in e &&
        e.message.includes('unique constraint')
      ) {
        set.status = 409;
        return { error: 'Map with this GeoGuessr ID already exists.' };
      }
      set.status = 500;
      return { error: 'Internal Server Error' };
    }
  },
  {
     body: t.Object({
      name: t.String({ minLength: 1 }),
      geoguessrId: t.String({ minLength: 1 }),
    }),
    userId: true,
  }
);
