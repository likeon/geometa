import { Elysia, t } from 'elysia';
import { db } from '@lib/drizzle';
import { maps } from '@lib/db/schema';
import { eq } from 'drizzle-orm';
import { getRequestIp } from '@lib/utils/log';
import { BunRequest } from 'bun';

const userscriptVersion = '0.82';

export const userscriptRouter = new Elysia({prefix: '/userscript'})
  .get('/map/:geoguessrId', async ({ params: { geoguessrId }, set, server, request }) => {
    const map = await db.query.maps.findFirst({
      where: eq(maps.geoguessrId, geoguessrId)
    });
    if (!map || map.geoguessrId !== geoguessrId) {
      if (map) {
        console.error(JSON.stringify({
          'level': 'error',
          'type': 'foundMapMismatch',
          'ip': getRequestIp(server, request as BunRequest)
        }));
      }
      set.status = 404;
      return { mapFound: false, userscriptVersion: userscriptVersion };
    }

    return {
      mapFound: true,
      userscriptVersion: userscriptVersion
    };
  })
  .get('/location/', async ({ query, set }) => {
    const key = `${query.mapId}:${query.panoId}`;
    const value = 1;
    if (!value) {
      set.status = 404;
      return ['NOT_FOUND'];
    }
    set.headers['content-type'] = 'application/json'
    return value;
  }, {
    query: t.Object({
      mapId: t.String(),
      panoId: t.String()
    })
  });
