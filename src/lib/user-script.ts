import { db } from '$lib/drizzle';
import { mapLocations, maps } from '$lib/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { cloudflareKvBulkPut, cutToTwoDecimals, getCountryFromTagName } from '$lib/utils';
import type { KVNamespace } from '@cloudflare/workers-types';

type UserScriptDataItem = {
  country: string;
  metaName: string;
  note: string;
  plonkitCountryUrl: string;
  images: string[];
};

export async function syncUserScriptData(groupId: number, kvNamespace: KVNamespace) {
  const dbValues = await db
    .select({
      geoguessrId: maps.geoguessrId,
      lat: mapLocations.lat,
      lng: mapLocations.lng,
      tagName: mapLocations.tagName,
      metaName: mapLocations.metaName,
      metaNote: mapLocations.metaNote,
      images: sql<
        string | null
      >`(select GROUP_CONCAT(mi.image_url) from meta_images mi where mi.meta_id = ${mapLocations.metaId})`
    })
    .from(mapLocations)
    .innerJoin(maps, eq(mapLocations.mapId, maps.id))
    .where(eq(maps.mapGroupId, groupId))
    .orderBy(asc(maps.id));

  const kvCacheKey = `cache:userscript:${groupId}`;
  const cachedKvJson = await kvNamespace.get(kvCacheKey);

  let cachedKvData: Map<string, UserScriptDataItem>;
  if (cachedKvJson) {
    cachedKvData = new Map(Object.entries(JSON.parse(cachedKvJson)));
  } else {
    cachedKvData = new Map();
  }

  const kvData = [];
  for (const item of dbValues) {
    const key = `${item.geoguessrId}:${cutToTwoDecimals(item.lat)}:${cutToTwoDecimals(item.lng)}`;
    const countryName = getCountryFromTagName(item.tagName);
    const plonkitCountryUrl = `https://www.plonkit.net/${countryName.toLowerCase().replace(' ', '-')}`;

    let images: string[];
    if (item.images) {
      images = item.images
        .split(',')
        .map((url) => `https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/${url}`);
    } else {
      images = [];
    }

    const value = {
      country: getCountryFromTagName(item.tagName),
      metaName: item.metaName,
      note: item.metaNote,
      plonkitCountryUrl: plonkitCountryUrl,
      images: images
    };
    const cachedValue = cachedKvData.get(key);
    if (cachedValue != value) {
      cachedKvData.set(key, value);
      kvData.push({ key: key, value: JSON.stringify(value), base64: false });
    }
  }
  if (kvData) {
    await cloudflareKvBulkPut(kvData);
    await kvNamespace.put(kvCacheKey, JSON.stringify(cachedKvData));
  }
}
