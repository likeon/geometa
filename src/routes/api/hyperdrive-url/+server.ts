import { json } from '@sveltejs/kit';
import { ensurePermissions } from '$lib/utils';

export async function GET(event) {
  await ensurePermissions(event.locals.user?.id, 1);
  return json({ url: event.platform!.env.db?.connectionString });
}
