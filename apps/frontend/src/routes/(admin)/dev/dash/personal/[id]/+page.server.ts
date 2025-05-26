import { api } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';

export const prerender = false;

export const load: PageServerLoad = async ({ params, locals }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    error(400, 'Invalid ID');
  }

  const { data, error: apiError } = await api.internal.maps.personal({ id }).get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });

  if (apiError) {
    switch (apiError.status) {
      case 404:
        error(404, 'Map not found');
      default:
        error(500, 'Something went wrong.');
    }
  }

  return { id, metaList: data.metas, mapName: data.name };
};

export const actions = {
  removeMetasFromPersonalMap: async ({ params, request, locals }) => {
    const form = await request.formData();
    const idsRaw = form.getAll('id');
    const ids = idsRaw
      .flatMap((val) => (Array.isArray(val) ? val : [val]))
      .map((id) => parseInt(id as string, 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      error(400, 'No valid IDs provided');
    }
    const { error: apiError } = await api.internal.maps.personal({ id: params.id }).metas.delete(
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
      success: true
    };
  }
};
