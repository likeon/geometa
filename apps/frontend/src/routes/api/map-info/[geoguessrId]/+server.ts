import { maps } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

const userscriptVersionKey = 'userscript:version';

export async function GET({ params, platform, locals }) {
  const mapPromise = locals.db.query.maps.findFirst({
    where: eq(maps.geoguessrId, params.geoguessrId)
  });
  // todo: update?
  const userscriptVersionPromise = '0.82';
  const [map, userscriptVersion] = await Promise.all([mapPromise, userscriptVersionPromise]);
  if (!map || map.geoguessrId !== params.geoguessrId) {
    return json({ mapFound: false, userscriptVersion: userscriptVersion }, { status: 404 });
  }

  return json({
    mapFound: true,
    userscriptVersion: userscriptVersion
  });
}
