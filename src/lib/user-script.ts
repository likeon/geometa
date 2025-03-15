import { type DB } from '$lib/drizzle';
import { mapGroups, mapLocations, maps, metas } from '$lib/db/schema';
import { and, asc, eq, gt, or, type SQL, sql } from 'drizzle-orm';
import {
  cloudflareKvBulkPut,
  generateFooter,
  generatePlonkitLink,
  getCountryFromTagName,
  markdown2Html
} from '$lib/utils';

export async function syncUserScriptData(db: DB, groupId: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const group = await db.query.mapGroups.findFirst({ where: eq(mapGroups.id, groupId) });
  if (!group) {
    throw new Error(`Invalid group id`);
  }

  let offset = 0;
  const iterateOver = 7500;
  while (true) {
    const conditions = [eq(maps.mapGroupId, groupId)];

    if (group.syncedAt != null) {
      conditions.push(
        or(
          gt(mapLocations.modifiedAt, group.syncedAt),
          gt(mapLocations.metaModifiedAt, group.syncedAt),
          gt(mapLocations.mapModifiedAt, group.syncedAt)
        ) as SQL
      );
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
        metaNoteFromPlonkit: metas.noteFromPlonkit,
        images: sql<string | null>`
          (SELECT STRING_AGG(mi.image_url, ',' ORDER BY mi.id)
           FROM meta_images mi
           WHERE mi.meta_id = ${mapLocations.metaId})
        `
      })
      .from(mapLocations)
      .innerJoin(maps, eq(mapLocations.mapId, maps.id))
      .innerJoin(metas, eq(mapLocations.metaId, metas.id))
      .where(and(...conditions))
      .orderBy(asc(maps.id), asc(mapLocations.metaId))
      .limit(iterateOver)
      .offset(offset);

    const kvData = [];
    for (const item of dbValues) {
      const key = `${item.geoguessrId}:${item.panoId}`;

      const countryName = getCountryFromTagName(item.tagName);
      const plonkitCountryUrl = generatePlonkitLink(countryName);

      let footer: string;

      if (item.metaNoteFromPlonkit) {
        footer = await generateFooter(countryName, item.metaNoteFromPlonkit);
      } else {
        footer = item.metaFooterHtml.trim() || item.mapFooterHtml.trim();

        if (!footer) {
          footer = await generateFooter(countryName, item.metaNoteFromPlonkit);
        }
      }

      let images: string[];
      if (item.images) {
        images = item.images.split(',').map(getImageUrl);
      } else {
        images = [];
      }

      const value = {
        country: countryName,
        metaName: item.metaName,
        note: item.metaNoteHtml,
        plonkitCountryUrl,
        images: images,
        footer
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
