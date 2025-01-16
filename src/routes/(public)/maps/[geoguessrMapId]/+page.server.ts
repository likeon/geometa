import { db } from '$lib/drizzle';
import { eq } from 'drizzle-orm';
import { mapMetas } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { checkIfValidCountry, getCountryFromTagName } from '$lib/utils.js';

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

  const countries = rawMapMetaList.map((meta) => getCountryFromTagName(meta.metaTag));
  const uniqueCountries = new Set(countries);
  const isSingleCountry = uniqueCountries.size === 1;

  // Don't display country tag for maps where all the metas is from the same country
  const mapMetaList = rawMapMetaList
    .map((meta, index) => ({
      name: isSingleCountry ? meta.metaName : `${countries[index]} - ${meta.metaName}`,
      noteHtml: meta.metaNoteHtml,
      imageUrls: meta.metaImageUrls ? meta.metaImageUrls.split(',').map((url) => url.trim()) : [],
      footer: getFooter(meta)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    mapMetaList,
    mapName
  };
};

function getFooter(meta: any) {
  const country = getCountryFromTagName(meta.metaTag);
  if (meta.metaFooterHtml.trim() != '') {
    return meta.metaFooterHtml;
  } else if (meta.mapFooterHtml.trim() != '') return meta.mapFooterHtml;
  else if (checkIfValidCountry(getCountryFromTagName(country))) {
    return `Check out <a href="https://www.plonkit.net/${country}" rel="nofollow" target="_blank">https://www.plonkit.net/${country}</a> for more hints.`;
  } else {
    return '';
  }
}
