import { db } from '$lib/drizzle';
import { getGroupId } from '../utils';
import { eq, sql } from 'drizzle-orm';
import { mapGroups, maps } from '$lib/db/schema';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const groupId = getGroupId(params);

	const group = await db.query.mapGroups.findFirst({
		with: {
			maps: {
				extras: {
					locationsCount:
						sql`(select count(*) from map_locations_view ml where ml.map_id = ${maps.id})`.as(
							'locations_count'
						)
				},
				with: {
					level: true
				}
			}
		},
		where: eq(mapGroups.id, groupId)
	});

	if (!group) {
		error(404, 'No group');
	}

	return { group };
};
