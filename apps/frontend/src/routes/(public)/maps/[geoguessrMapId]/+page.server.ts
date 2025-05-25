import { error } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const geoguessrId = params.geoguessrMapId;

  const {data: map, error: mapApiError} = await api.internal.maps({ geoguessrId }).get();

  if (mapApiError) {
    error(500);
  }

  if (map.isPersonal) {
    error(500);
  }

  const  {data: metaList, error: apiError} =  await api.internal.maps.metas({mapId: map.id}).get();
  if (apiError) {
    error(500);
  }
  return {
    metaList,
    mapName: map.name,
    mapGeoguessrId: map.geoguessrId
  };
};
