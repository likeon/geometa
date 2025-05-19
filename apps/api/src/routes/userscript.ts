import { generateFooter } from '@/lib/internal/sync/utils';
import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@lib/db/schema';
import { db } from '@lib/drizzle';
import { getRequestIp } from '@lib/utils/log';
import type { BunRequest } from 'bun';
import { and, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.82';

export const userscriptRouter = new Elysia({
  prefix: '/userscript',
  detail: { tags: ['userscript'] },
})
  .get(
    '/map/:geoguessrId',
    async ({ params: { geoguessrId }, set, server, request }) => {
      const map = await db.query.maps.findFirst({
        where: eq(maps.geoguessrId, geoguessrId),
      });
      if (!map || map.geoguessrId !== geoguessrId) {
        if (map) {
          console.error(
            JSON.stringify({
              level: 'error',
              type: 'foundMapMismatch',
              ip: getRequestIp(server, request as BunRequest),
            }),
          );
        }
        set.status = 404;
        return { mapFound: false, userscriptVersion: userscriptVersion };
      }

      return {
        mapFound: true,
        userscriptVersion: userscriptVersion,
      };
    },
  )
  .get(
    '/location/',
    async ({ query, set }) => {
      const key = `${query.mapId}:${query.panoId}`;

      const result = await db
        .select({
          name: syncedMetas.name,
          note: syncedMetas.note,
          noteFromPlonkit: syncedMetas.noteFromPlonkit,
          footer: syncedMetas.footer,
          images: syncedMetas.images,
          country: syncedLocations.country,
          mapFooter: maps.footerHtml,
        })
        .from(syncedMetas)
        .innerJoin(
          syncedMapMetas,
          eq(syncedMapMetas.syncedMetaId, syncedMetas.metaId),
        )
        .innerJoin(maps, eq(syncedMapMetas.mapId, maps.id))
        .innerJoin(
          syncedLocations,
          eq(syncedLocations.syncedMetaId, syncedMetas.metaId),
        )
        .where(
          and(
            eq(maps.geoguessrId, query.mapId),
            eq(syncedLocations.panoId, query.panoId),
          ),
        )
        .limit(1);
      const [meta] = result;
      if (!meta) {
        set.status = 404;
        return ['NOT_FOUND'];
      }
      let footer: string;

      // hack for now, should country be marked as not null in schema since we will always have it?
      const country = meta.country || '';

      if (meta.noteFromPlonkit) {
        footer = await generateFooter(country, meta.noteFromPlonkit);
      } else {
        footer = meta.footer.trim() || meta.mapFooter.trim();

        if (!footer) {
          footer = await generateFooter(country, meta.noteFromPlonkit);
        }
      }

      const value = {
        country: country,
        metaName: meta.name,
        note: meta.note,
        images: meta.images,
        footer: footer,
      };
      set.headers['content-type'] = 'application/json';
      return value;
    },
    {
      query: t.Object({
        mapId: t.String(),
        panoId: t.String(),
      }),
    },
  );
