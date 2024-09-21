import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { maps: await db.query.maps.findMany() };
};
