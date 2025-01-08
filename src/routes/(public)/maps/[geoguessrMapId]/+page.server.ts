import { db } from '$lib/drizzle';
import { eq } from 'drizzle-orm';
import { mapMetas } from '$lib/db/schema';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
  const geoguessrMapId = params.geoguessrMapId;
  const rawMapMetaList = await db
    .select()
    .from(mapMetas)
    .where(eq(mapMetas.geoguessrId, geoguessrMapId))
    .orderBy(mapMetas.metaName);

  if (rawMapMetaList.length == 0) {
    throw error(404, 'Map not found');
  }

  const mapName = rawMapMetaList[0].mapName;

  const mapMetaList = rawMapMetaList.map((meta) => ({
    name: meta.metaName,
    noteHtml: meta.metaNoteHtml,
    imageUrls: meta.metaImageUrls ? meta.metaImageUrls.split(',').map((url) => url.trim()) : []
  }));

  return {
    mapMetaList,
    mapName
  };
};
