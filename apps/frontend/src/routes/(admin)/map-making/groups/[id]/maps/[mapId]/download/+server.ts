import { api } from '$lib/api';
import { error } from '@sveltejs/kit';

export async function GET(event) {
  const params = event.params;
  const rawGroupId = params.id;
  const rawMapId = params.mapId;

  if (!rawGroupId || !rawMapId) {
    error(404, 'Invalid url');
  }
  const groupId = parseInt(rawGroupId, 10);
  const mapId = parseInt(rawMapId, 10);

  if (isNaN(mapId) || isNaN(groupId)) {
    error(400, 'Invalid ID');
  }

  const { data, error: apiError } = await api.internal.maps
    .group({ id: mapId })
    .download.get({ query: { groupId } });

  if (apiError || !data) {
    const status = apiError?.status as number;
    if (status === 404) {
      error(404, 'Map not found');
    }
    if (status === 403) {
      error(403, 'Permission denied');
    }
    console.error('Download API Error:', apiError);
    error(500, 'Failed to download map');
  }

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${data.name}.json"`
    }
  });
}
