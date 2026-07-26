import { getGroupId } from '../../../utils';
import { error } from '@sveltejs/kit';
import { api, throwApiError } from '$lib/api';

export const load = async ({ params }) => {
  const groupId = getGroupId(params);
  const mapId = parseInt(params.mapId, 10);
  if (isNaN(mapId)) {
    error(400, 'Invalid map ID');
  }

  const { data, error: apiError } = await api.internal.maps
    .group({ id: mapId })
    ['meta-balance'].get({ query: { groupId } });

  if (apiError || !data) {
    throwApiError(apiError, { 404: 'No map' });
  }

  return { groupId, balance: data };
};
