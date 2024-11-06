import { db } from '$lib/drizzle';
import { mapLocations, maps, metas } from '$lib/db/schema';
import { asc, eq, sql, inArray } from 'drizzle-orm';
import { cloudflareKvBulkPut, getCountryFromTagName, isDeepEqual } from '$lib/utils';
import type { KVNamespace } from '@cloudflare/workers-types';

type UserScriptDataItem = {
  country: string;
  metaName: string;
  note: string;
  plonkitCountryUrl: string;
  images: string[];
};

type MetaWithLocation = {
  metaId: number;
  locations: number;
};

function groupMetas(items: MetaWithLocation[]): number[][] {
  const result: number[][] = [];
  let currentGroup: MetaWithLocation[] = [];
  let currentLocationsSum = 0;

  for (const item of items) {
    // If the item has locations >= 1000, put it in its own group
    if (item.locations >= 1000) {
      result.push([item.metaId]);
      continue;
    }

    // If adding the item would exceed 1000 locations, start a new group
    if (currentLocationsSum + item.locations > 1000) {
      result.push(currentGroup.map((metaItem) => metaItem.metaId));
      currentGroup = [];
      currentLocationsSum = 0;
    }

    // Add the item to the current group
    currentGroup.push(item);
    currentLocationsSum += item.locations;
  }

  // Add the last group if it's not empty
  if (currentGroup.length > 0) {
    result.push(currentGroup.map((metaItem) => metaItem.metaId));
  }

  return result;
}

export async function syncUserScriptData(groupId: number, kvNamespace: KVNamespace) {
  const metasWithLocationsCount = await db
    .select({
      metaId: metas.id,
      locations: sql<number>`(select COUNT(*) from location_metas_view lmv where lmv.meta_id = "metas"."id")`
    })
    .from(metas)
    .where(eq(metas.mapGroupId, groupId));
  const metasGroupped = groupMetas(metasWithLocationsCount);

  const dbValues = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < metasGroupped.length; i += BATCH_SIZE) {
    // Create a batch of `metaIds` groups
    const batch = metasGroupped.slice(i, i + BATCH_SIZE);

    // Map each group of `metaIds` to a database promise
    const batchPromises = batch.map((metaIds) =>
      db
        .select({
          geoguessrId: maps.geoguessrId,
          panoId: mapLocations.panoId,
          tagName: mapLocations.tagName,
          metaName: mapLocations.metaName,
          metaNoteHtml: mapLocations.metaNoteHtml,
          images: sql<string | null>`
        (SELECT GROUP_CONCAT(mi.image_url)
         FROM meta_images mi
         WHERE mi.meta_id = ${mapLocations.metaId})
       `
        })
        .from(mapLocations)
        .innerJoin(maps, eq(mapLocations.mapId, maps.id))
        .where(inArray(mapLocations.metaId, metaIds))
        .orderBy(asc(maps.id))
    );

    // Execute the current batch in parallel
    const batchResults = await Promise.all(batchPromises);

    // Flatten and add results from this batch to dbValues
    dbValues.push(...batchResults.flat());
  }

  const kvCacheKey = `cache:userscript:${groupId}`;
  const cachedKvJson = await kvNamespace.get(kvCacheKey);

  let cachedKvData: Map<string, UserScriptDataItem>;
  if (cachedKvJson) {
    cachedKvData = new Map(JSON.parse(cachedKvJson));
  } else {
    cachedKvData = new Map();
  }

  const kvData = [];
  for (const item of dbValues) {
    const key = `${item.geoguessrId}:${item.panoId}`;
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
      note: item.metaNoteHtml,
      plonkitCountryUrl: plonkitCountryUrl,
      images: images
    };
    const cachedValue = cachedKvData.get(key);
    if (!isDeepEqual(value, cachedValue)) {
      cachedKvData.set(key, value);
      kvData.push({ key: key, value: JSON.stringify(value), base64: false });
    }
  }
  if (kvData) {
    await cloudflareKvBulkPut(kvData);
    // skip cache for big russia map for a test
    if (groupId != 12) {
      await kvNamespace.put(kvCacheKey, JSON.stringify(Array.from(cachedKvData.entries())));
    }
  }
}
