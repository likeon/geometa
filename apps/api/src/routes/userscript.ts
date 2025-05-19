import {
  maps,
  syncedLocations,
  syncedMapMetas,
  syncedMetas,
} from '@lib/db/schema';
import { db } from '@lib/drizzle';
import { generateFooter } from '@lib/userscript/utils';
import { getRequestIp } from '@lib/utils/log';
import type { BunRequest } from 'bun';
import { and, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

const userscriptVersion = '0.82';

const locationSelect = db
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
      eq(maps.geoguessrId, sql.placeholder('mapId')),
      eq(syncedLocations.panoId, sql.placeholder('panoId')),
    ),
  )
  .limit(1)
  .prepare('userscript_get_location');

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
      const result = await locationSelect.execute(query);
      const [meta] = result;
      if (!meta) {
        set.status = 404;
        return ['NOT_FOUND'];
      }
      // hack for now, should country be marked as not null in schema since we will always have it?
      const country = meta.country || '';

      const footer = generateFooter(
        meta.noteFromPlonkit,
        country,
        meta.footer,
        meta.mapFooter,
      );

      return {
        country: country,
        metaName: meta.name,
        note: meta.note,
        images: meta.images,
        footer: footer,
      };
    },
    {
      query: t.Object({
        mapId: t.String(),
        panoId: t.String(),
      }),
    },
  );
