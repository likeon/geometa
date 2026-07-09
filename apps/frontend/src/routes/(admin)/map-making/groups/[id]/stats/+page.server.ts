import { error } from '@sveltejs/kit';
import { getGroupId } from '../utils';
import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
  const groupId = getGroupId(params);

  const { data: group, error: apiError } = await api.internal['map-groups']({
    id: groupId
  }).get();

  if (apiError || !group) {
    const status = apiError?.status as number;
    if (status === 404) {
      error(404, 'No group');
    }
    if (status === 403) {
      error(403, 'Permission denied');
    }
    error(500, 'Something went wrong.');
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
