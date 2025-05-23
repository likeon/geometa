import { api } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';

export const prerender = false;


export const load: PageServerLoad = async ({ params,locals }) => {
const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    error(400, 'Invalid ID');
  }

  const result = await api.internal.maps.personal[id].get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });
  const geoguessrId = result.data!.geoguessrId;
  const mapName = result.data!.name;
  return { id,geoguessrId , mapName};
};
