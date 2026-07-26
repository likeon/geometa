import { getGroupId } from '../utils';
import { api, throwApiError } from '$lib/api';

export const load = async ({ params }) => {
  const id = getGroupId(params);

  const { data, error: apiError } = await api.internal['map-groups']({ id })['changes-page'].get({
    query: {}
  });

  if (apiError || !data) {
    throwApiError(apiError, { 404: 'No group' });
  }

  return {
    group: data.group,
    unsyncedChanges: data.unsyncedChanges,
    changes: data.changes,
    hasMore: data.hasMore,
    role: data.role
  };
};
