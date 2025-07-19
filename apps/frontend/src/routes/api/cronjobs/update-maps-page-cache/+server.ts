import { json } from '@sveltejs/kit';
import { checkAuth } from '$routes/api/cronjobs/auth';
import { getDbData, updateCache } from '$lib/server/mapsCache';

export async function POST({ request }) {
  checkAuth(request);
  await updateCache(await getDbData());

  return json(['success']);
}
