import { json } from '@sveltejs/kit';
import { getGroupId } from '../../utils';
import { api, throwApiError } from '$lib/api';

// pagination endpoint for the change log's "load older" button
export const GET = async ({ params, url }) => {
  const id = getGroupId(params);
  const before = url.searchParams.get('before') ?? undefined;

  const { data, error: apiError } = await api.internal['map-groups']({ id })['changes-page'].get({
    query: { before }
  });

  if (apiError || !data) {
    throwApiError(apiError, { 404: 'No group' });
  }

  return json({ changes: data.changes, hasMore: data.hasMore });
};
