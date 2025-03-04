import { db } from '$lib/drizzle';
import { maps } from '$lib/db/schema';
import { eq, SQL, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { checkAuth } from '$routes/api/cronjobs/auth';
import { geoguessrGetMapInfo } from '$lib/utils';

export async function POST({ request }) {
  checkAuth(request);
  const mapIds = await db
    .select({ geoguessrId: maps.geoguessrId })
    .from(maps)
    .where(eq(maps.isPublished, true));

  const mapsUsageData = [];
  for (const item of mapIds) {
    const mapData = await geoguessrGetMapInfo(item.geoguessrId);
    mapsUsageData.push({
      geoguessrId: item.geoguessrId,
      numberOfGamesPlayed: mapData?.numberOfGamesPlayed || null
    });
  }

  const sqlChunks: SQL[] = [];
  sqlChunks.push(sql`UPDATE maps SET number_of_games_played = CASE`);

  for (const mapDataItem of mapsUsageData) {
    sqlChunks.push(
      sql`WHEN geoguessr_id = ${mapDataItem.geoguessrId} THEN ${mapDataItem.numberOfGamesPlayed}`
    );
  }

  sqlChunks.push(sql`END WHERE geoguessr_id IN ${mapsUsageData.map((item) => item.geoguessrId)}`);

  const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));
  await db.run(finalSql);

  return json(['success']);
}
