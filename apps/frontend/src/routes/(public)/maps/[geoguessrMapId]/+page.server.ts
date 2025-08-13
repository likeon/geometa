import { error, fail } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

type PersonalMap = {
  name: string;
  id: number;
  metasCount: number;
};

export const load: PageServerLoad = async ({ params, locals }) => {
  const geoguessrId = params.geoguessrMapId;
  let isLoggedIn = false;
  let personalMaps: PersonalMap[] = [];
  if (locals.user) {
    isLoggedIn = true;
    const { data, error: apiError } = await api.internal.maps.personal.get({
      headers: {
        'x-api-user-id': locals.user!.id
      }
    });

    if (apiError) {
      error(500);
    }

    personalMaps = data.map(({ id, name, metasCount }) => ({ id, name, metasCount }));
  }

  const { data: map, error: mapApiError } = await api.internal.maps({ geoguessrId }).get();

  if (mapApiError) {
    error(500);
  }

  // if (map.isPersonal) {
  //   // TODO: show map different way when its personal map(add maybe like from which map is meta etc)
  //   error(500);
  // }

  const { data: metaList, error: apiError } = await api.internal.maps
    .metas({ mapId: map.id })
    .get();
  if (apiError) {
    // TODO: if map not found error 404, if something else 500
    error(500);
  }
  
  const totalLocations = metaList.reduce((sum, meta) => {
    const count = parseInt(String(meta.locationsCount), 10) || 0;
    return sum + count;
  }, 0);
  
  return {
    metaList,
    mapName: map.name,
    mapAuthors: map.authors,
    isMapShared: map.isShared,
    mapGeoguessrId: map.geoguessrId,
    totalLocations,
    isLoggedIn,
    personalMaps
  };
};

export const actions = {
  addMetasToPersonalMap: async ({ request, locals }) => {
    const form = await request.formData();
    const idsRaw = form.getAll('id');
    const ids = idsRaw
      .flatMap((val) => (Array.isArray(val) ? val : [val]))
      .map((id) => parseInt(id as string, 10))
      .filter((id) => !isNaN(id));

    const mapIdRaw = form.get('mapId');
    const mapId = Number(mapIdRaw);
    if (!mapIdRaw || isNaN(mapId)) {
      error(400, 'Invalid or missing ID');
    }

    if (ids.length === 0) {
      error(400, 'No valid IDs provided');
    }
    const { data, error: apiError } = await api.internal.maps.personal({ id: mapId }).metas.post(
      {
        metaIds: ids
      },
      {
        headers: {
          'x-api-user-id': locals.user!.id
        }
      }
    );
    if (apiError) {
      return fail(apiError.status ?? 500, {
        message: apiError.value ?? 'Unknown error'
      });
    }

    return {
      success: true,
      inserted: data.inserted
    };
  }
};
