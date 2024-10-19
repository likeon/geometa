import { db } from '$lib/drizzle';
import { maps } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  const map = await db.query.maps.findFirst({ where: eq(maps.geoguessrId, params.geoguessrId) });
  if (!map) {
    return json({ mapFound: false }, { status: 404 });
  }

  return json({ mapFound: true });
}
