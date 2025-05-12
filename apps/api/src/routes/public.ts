import { Elysia } from 'elysia';
import { db } from '@lib/drizzle';
import { maps } from '@lib/db/schema';
import { eq } from 'drizzle-orm';
import { getRequestIp } from '@lib/utils/log';
import { BunRequest } from 'bun';

const userscriptVersion = '0.82';

export const publicRouter = new Elysia()
  .get('/map-info/:geoguessrId', async ({ params: { geoguessrId }, set, server, request }) => {
    const map = await db.query.maps.findFirst({
      where: eq(maps.geoguessrId, geoguessrId)
    });
    if (!map || map.geoguessrId !== geoguessrId) {
      if (map) {
        console.error(JSON.stringify({
          'level': 'error',
          'type': 'foundMapMismatch',
          'ip': getRequestIp(server, request as BunRequest)
        }))
      }
      set.status = 404;
      return { mapFound: false, userscriptVersion: userscriptVersion };
    }

    return {
      mapFound: true,
      userscriptVersion: userscriptVersion
    };
  });
