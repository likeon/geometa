import { db } from '$lib/drizzle';
import { eq } from 'drizzle-orm';
import { mapMetas, maps } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { generateFooter, getCountryFromTagName } from '$lib/utils.js';

export const load = async ({ params }) => {
  const geoguessrMapId = params.geoguessrMapId;
  const rawMapMetaList = await db
    .select()
    .from(mapMetas)
    .where(eq(mapMetas.geoguessrId, geoguessrMapId))
    .orderBy(mapMetas.metaTag);

  if (rawMapMetaList.length == 0) {
    throw error(404, 'Map not found');
  }

  const mapName = rawMapMetaList[0].mapName;
  const map = await db.query.maps.findFirst({ where: eq(maps.geoguessrId, geoguessrMapId) });

  const countries = rawMapMetaList.map((meta) => getCountryFromTagName(meta.metaTag));
  const uniqueCountries = new Set(countries);
  const isSingleCountry = uniqueCountries.size === 1;

  // Don't display country tag for maps where all the metas is from the same country
  const mapMetaList = await Promise.all(
    rawMapMetaList.map(async (meta, index) => {
      let footer: string = meta.metaFooterHtml.trim() || meta.mapFooterHtml.trim();

      if (!footer) {
        footer = await generateFooter(countries[index], meta.metaNoteFromPlonkit);
      }

      return {
        name: isSingleCountry ? meta.metaName : `${countries[index]} - ${meta.metaName}`,
        noteHtml: meta.metaNoteHtml,
        imageUrls: meta.metaImageUrls ? meta.metaImageUrls.split(',').map((url) => url.trim()) : [],
        footer
      };
    })
  );

  mapMetaList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    mapMetaList,
    mapName,
    map
  };
};
