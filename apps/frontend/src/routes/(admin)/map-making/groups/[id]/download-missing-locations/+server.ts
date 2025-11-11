import { api } from '$lib/api';
import { getGroupId } from '../utils';
import { error } from '@sveltejs/kit';

export async function GET(event) {
  const groupId = getGroupId(event.params);

  const { data, status } = await api.internal['locations'].get({
    query: { groupId, isOnStreetView: false }
  });

  if (status !== 200) {
    console.error('Download Missing Locations API Error: Invalid status code', status);
    error(500, 'Failed to download missing locations');
  }

  const jsonString = JSON.stringify(data, null, 4);

  return new Response(jsonString, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="missing-locations-${groupId}.json"`
    }
  });
}
