import { api } from '$lib/api';
import { error } from '@sveltejs/kit';

export const prerender = false;

export const load = async ({ params, locals }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    error(400, 'Invalid ID');
  }

  const { data, error: apiError } = await api.internal.maps.personal({ id }).get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });
  if (apiError)
    switch (apiError.status) {
      case 404:
        error(404, 'Map not found');
        break;
      default:
        throw apiError.value;
    }

  return { id, geoguessrId: data.geoguessrId, mapName: data.name };
};
