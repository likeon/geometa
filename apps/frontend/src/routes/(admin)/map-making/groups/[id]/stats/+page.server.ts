import { api, internalHeaders } from '$lib/api';
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

  try {
    const response = await api.internal['map-groups']({ id: groupId })['location-requests'].get({
      query: { days: validDays as 30 | 90 | 180 | 360 },
      ...internalHeaders(locals)
    });

    if (response.error) {
      console.error('API Error:', response.error);
      const errorMessage = response.error.value
        ? typeof response.error.value === 'string'
          ? response.error.value
          : JSON.stringify(response.error.value)
        : response.error.status?.toString() || 'Unknown error';
      throw new Error(`Failed to fetch stats: ${errorMessage}`);
    }

    // Also create summary data grouped by meta with daily data
    const summaryData =
      response.data?.map((meta: any) => ({
        metaId: meta.metaId,
        metaName: meta.metaName,
        totalCount: meta.totalCount,
        personalMapCount: meta.data.reduce(
          (sum: number, day: any) => sum + day.personalMapCount,
          0
        ),
        regularMapCount: meta.data.reduce((sum: number, day: any) => sum + day.regularMapCount, 0),
        dailyData: meta.data // Include the daily breakdown for charts
      })) || [];

    return {
      group,
      summaryData,
      selectedPeriod: validDays.toString()
    };
  } catch (err) {
    console.error('Error loading stats:', err);
    return {
      group,
      summaryData: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      selectedPeriod: validDays.toString()
    };
  }
};
