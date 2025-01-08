import { db } from '$lib/drizzle';
import { eq } from 'drizzle-orm';
import { mapMetas } from '$lib/db/schema';

export const load = async ({ params }) => {
  const geoguessrMapId = params.geoguessrMapId;
  const rawMapMetaList = await db
    .select()
    .from(mapMetas)
    .where(eq(mapMetas.geoguessrId, geoguessrMapId))
    .orderBy(mapMetas.metaName);
  const mapMetaList = rawMapMetaList.map((meta) => ({
    geoguessrId: meta.geoguessrId,
    name: meta.metaName,
    noteHtml: meta.metaNoteHtml,
    imageUrls: meta.metaImageUrls ? meta.metaImageUrls.split(',').map((url) => url.trim()) : []
  }));

  return {
    mapMetaList
  };
};
