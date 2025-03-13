import { maps } from '$lib/db/schema';
import { eq, SQL, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { checkAuth } from '$routes/api/cronjobs/auth';
import { geoguessrGetMapInfo } from '$lib/utils';

export async function POST({ request, locals }) {
  checkAuth(request);
  const mapIds = await locals.db
    .select({ geoguessrId: maps.geoguessrId })
    .from(maps)
    .where(eq(maps.isPublished, true));

  const mapsUsageData = [];
  for (const item of mapIds) {
    const mapData = await geoguessrGetMapInfo(item.geoguessrId);
    mapsUsageData.push({
      geoguessrId: item.geoguessrId,
      numberOfGamesPlayed: mapData?.numberOfGamesPlayed || null,
      numberOfGamesPlayedDiminished: powerLawReward(mapData?.numberOfGamesPlayed || 0)
    });
  }

  const sqlChunks: SQL[] = [];
  sqlChunks.push(sql`UPDATE maps SET number_of_games_played = CASE`);

  // number_of_games_played
  for (const mapDataItem of mapsUsageData) {
    sqlChunks.push(
      sql`WHEN geoguessr_id = ${mapDataItem.geoguessrId} THEN ${mapDataItem.numberOfGamesPlayed}`
    );
  }

  // number_of_games_played_diminished
  sqlChunks.push(sql`END, number_of_games_played_diminished = CASE`);
  for (const mapDataItem of mapsUsageData) {
    sqlChunks.push(
      sql`WHEN geoguessr_id = ${mapDataItem.geoguessrId} THEN ${mapDataItem.numberOfGamesPlayedDiminished}`
    );
  }
  sqlChunks.push(sql`END WHERE geoguessr_id IN ${mapsUsageData.map((item) => item.geoguessrId)}`);

  const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));
  await locals.db.execute(finalSql);

  return json(['success']);
}

// produces results from 20 (value=1) to 80 (value=1mil)
function powerLawReward(value: number) {
  const alpha = 0.1; // exponent for diminishing returns (0 < alpha < 1)
  const scale = 20; // overall scaling factor

  return Math.floor(scale * Math.pow(1 + value, alpha));
}
