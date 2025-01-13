import { db } from '$lib/drizzle';
import { mapGroups, mapLocations, maps, metas } from '$lib/db/schema';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import {
  checkIfValidCountry,
  cloudflareKvBulkPut,
  generatePlonkitLink,
  getCountryFromTagName
} from '$lib/utils';

export async function syncUserScriptData(groupId: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const group = await db.query.mapGroups.findFirst({ where: eq(mapGroups.id, groupId) });
  if (!group) {
    throw new Error(`Invalid group id`);
  }

  let offset = 0;
  const iterateOver = 10000;
  while (true) {
    const conditions = [eq(maps.mapGroupId, groupId)];

    if (group.syncedAt != null) {
      conditions.push(gt(mapLocations.maxModifiedAt, group.syncedAt));
    }

    const dbValues = await db
      .select({
        geoguessrId: maps.geoguessrId,
        panoId: mapLocations.panoId,
        tagName: mapLocations.tagName,
        metaName: mapLocations.metaName,
        metaNoteHtml: mapLocations.metaNoteHtml,
        metaFooterHtml: metas.footerHtml,
        mapFooterHtml: maps.footerHtml,
        images: sql<string | null>`
      (
        SELECT GROUP_CONCAT(sorted.image_url)
        FROM (
          SELECT mi.image_url
          FROM meta_images mi
          WHERE mi.meta_id = ${mapLocations.metaId}
          ORDER BY mi.id
        ) AS sorted
      )
      `
      })
      .from(mapLocations)
      .innerJoin(maps, eq(mapLocations.mapId, maps.id)) // Join with maps table
      .innerJoin(metas, eq(mapLocations.metaId, metas.id)) // Join with metas table
      .where(and(...conditions))
      .orderBy(asc(maps.id), asc(mapLocations.metaId))
      .limit(iterateOver)
      .offset(offset);

    const kvData = [];
    for (const item of dbValues) {
      const key = `${item.geoguessrId}:${item.panoId}`;

      const countryName = getCountryFromTagName(item.tagName);
      const plonkitCountryUrl = generatePlonkitLink(countryName);

      let footer;
      if (item.metaFooterHtml && item.metaFooterHtml.trim() !== '') {
        footer = item.metaFooterHtml;
      } else if (item.mapFooterHtml && item.mapFooterHtml.trim() !== '') {
        footer = item.mapFooterHtml;
      } else {
        footer = checkIfValidCountry(countryName)
          ? `Check out ${plonkitCountryUrl} for more clues.`
          : '';
      }

      let images: string[];
      if (item.images) {
        images = item.images.split(',').map(getImageUrl);
      } else {
        images = [];
      }

      const value = {
        countryName,
        metaName: item.metaName,
        note: item.metaNoteHtml,
        plonkitCountryUrl,
        images: images
      };

      kvData.push({ key: key, value: JSON.stringify(value), base64: false });
    }
    if (kvData) {
      await cloudflareKvBulkPut(kvData);
    }
    console.debug(kvData.length);
    if (kvData.length < iterateOver) {
      break;
    } else {
      offset = offset + iterateOver;
    }
  }
  await db.update(mapGroups).set({ syncedAt: currentTimestamp }).where(eq(mapGroups.id, groupId));
}

function getImageUrl(url: string): string {
  const geometa_storage_prefix = 'https://static.learnablemeta.com/';

  if (url.startsWith(geometa_storage_prefix)) {
    return `https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/${url}`;
  }

  return url;
}
