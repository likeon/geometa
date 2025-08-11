import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { mapGroups } from '$lib/db/schema';
import { getGroupId } from '../utils';
import { ensurePermissions } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const groupId = getGroupId(params);
  await ensurePermissions(locals.db, locals.user!.id, groupId);

  // Get group info from database like other pages
  const group = await locals.db.query.mapGroups.findFirst({
    where: eq(mapGroups.id, groupId)
  });

  if (!group) {
    error(404, 'No group');
  }

  // Get days from URL query parameter, default to 30
  const days = Number(url.searchParams.get('days')) || 30;
  const validDays = [30, 90, 180, 360].includes(days) ? days : 30;

  // Statistics are temporarily unavailable
  return {
    group,
    summaryData: [],
    combinedStats: [],
    selectedPeriod: validDays.toString(),
    statsUnavailable: true
  };
};
