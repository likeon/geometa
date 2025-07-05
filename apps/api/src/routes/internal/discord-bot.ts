import { maps, users } from "@api/lib/db/schema";
import { db } from "@api/lib/drizzle";
import { auth } from "@api/lib/internal/auth";
import { ensurePermissions } from "@api/lib/internal/permissions";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

export const discordBotRouter = new Elysia({ prefix: "/discord-bot" })
  .use(auth())
  .post(
    "maps/:geoguessrId/publish",
    async ({ params: { geoguessrId }, body, status }) => {
      const map = await db.query.maps.findFirst({
        where: eq(maps.geoguessrId, geoguessrId),
        with: { mapRegions: true },
      });
      if (!map) {
        return status(404);
      }

      if (map.isPersonal) {
        return status(400, {
          errors: ["Personal maps can't be published"],
        });
      }
      if (map.isPublished) {
        console.debug(map);
        return status(400, {
          errors: ["Already published"],
        });
      }

      ensurePermissions(body.discord_thread_author_id, map.mapGroupId!);

      const errors: string[] = [];
      if (!map.authors?.trim()) {
        errors.push("Author(s) not specified");
      }
      if (!map.description?.trim()) {
        errors.push("Description is missing");
      }
      if (!map.mapRegions.length) {
        errors.push("Regions are not selected");
      }

      if (errors.length) {
        return status(400, {
          errors: errors,
        });
      }

      await db
        .update(maps)
        .set({ isPublished: true })
        .where(eq(maps.geoguessrId, geoguessrId));
      return status(200);
    },
    {
      body: t.Object({ discord_thread_author_id: t.String() }),
    },
  );
