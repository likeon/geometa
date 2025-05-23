import { api } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

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
  // change it(?)
  const metaList = result.data!.metas;
  const mapName = result.data!.name;
  return { id, metaList, mapName };
};
