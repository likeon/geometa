import { db } from '$lib/drizzle';
import { asc, eq } from 'drizzle-orm';
import { mapGroups, metas } from '$lib/db/schema';
import { ensurePermissions } from '$lib/utils';
import { getGroupId } from '../utils';

export async function GET(event) {
  const groupId = getGroupId(event.params);
  await ensurePermissions(event.locals.user?.id, groupId);

  const group = await db.query.mapGroups.findFirst({ where: eq(mapGroups.id, groupId) });

  const data = await db.query.metas.findMany({
    where: eq(metas.mapGroupId, groupId),
    orderBy: [asc(metas.id)],
    with: {
      metaLevels: { with: { level: true } },
      images: true
    }
  });
  const result = data.map((meta) => ({
    tagName: meta.tagName,
    metaName: meta.name,
    note: meta.note,
    footer: meta.footer,
    levels: meta.metaLevels.map((metaLevel) => metaLevel.level.name),
    images: meta.images.map((image) => image.image_url)
  }));
  const jsonString = JSON.stringify(result);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${group!.name}_metas.json"`
  });

  return new Response(jsonString, {
    headers
  });
}
