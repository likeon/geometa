import { Elysia } from 'elysia';
import { db } from '@lib/drizzle';
import { maps } from '@lib/db/schema';
import { eq } from 'drizzle-orm';

export const publicRouter = new Elysia()
  .get('/map-info/:geoguessrId', async ({ params: { geoguessrId }, set }) => {
    const mapPromise = db.query.maps.findFirst({
      where: eq(maps.geoguessrId, geoguessrId)
    });
    // todo: update?
    const userscriptVersionPromise = '0.82';
    const [map, userscriptVersion] = await Promise.all([mapPromise, userscriptVersionPromise]);
    if (!map || map.geoguessrId !== geoguessrId) {
      set.status = 404;
      return { mapFound: false, userscriptVersion: userscriptVersion };
    }

    return {
      mapFound: true,
      userscriptVersion: userscriptVersion
    };
  });
