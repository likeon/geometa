import { db } from '$lib/drizzle';
import { mapGroups, mapLocations, maps } from '$lib/db/schema';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { cloudflareKvBulkPut, getCountryFromTagName } from '$lib/utils';

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
      .innerJoin(maps, eq(mapLocations.mapId, maps.id))
      .where(and(...conditions))
      .orderBy(asc(maps.id), asc(mapLocations.metaId))
      .limit(iterateOver)
      .offset(offset);
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
