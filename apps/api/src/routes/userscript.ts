import {
  cacheTable,
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

const legacyLocationSelect = db
  .select({ value: cacheTable.value })
  .from(cacheTable)
  .where(eq(cacheTable.key, sql.placeholder('key')))
  .limit(1)
  .prepare('userscript_legacy_get_location');

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

      set.status = 200;
      return {
        mapFound: true,
        userscriptVersion: userscriptVersion,
      };
    },
  )
  .get(
    '/location/',
    async ({ query, set }) => {
      const cacheKey = `${query.mapId}:${query.panoId}`;
      const result = await db.query.maps.findFirst({
        where: eq(maps.geoguessrId, query.mapId),
        columns: {
          isBlackout: true,
        },
      });
      const isBlackout = result?.isBlackout ?? false;
      if (isBlackout) {
        const blackoutFooter = `<p><a href="https://shorturl.at/jeT1y" rel="nofollow" target="_blank">Read more about blackout by clicking this link</a></p>`;
        return {
          country: 'BLACKOUT',
          metaName: 'BLACKOUT',
          note: 'The creator of this map has gone dark in solidarity with the blackout — a protest over GeoGuessr’s choice to participate in a tournament in Saudi Arabia, where human rights violations remain a serious issue.',
          images: [
            'https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/https://static.learnablemeta.com/blackout.png',
          ],
          footer: blackoutFooter,
        };
      }
      const [metaResult, legacyCacheResult] = await Promise.all([
        locationSelect.execute(query),
        legacyLocationSelect.execute({ key: cacheKey }),
      ]);
      if (!metaResult.length && !legacyCacheResult.length) {
        set.status = 404;
        return ['NOT_FOUND'];
      }
      set.status = 200;
      // fallback to legacy
      if (!metaResult.length) {
        return JSON.parse(legacyCacheResult[0].value);
      }

      const [meta] = metaResult;
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
