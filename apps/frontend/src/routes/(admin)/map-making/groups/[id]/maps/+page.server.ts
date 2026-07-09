import { getGroupId } from '../utils';
import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { insertMapsSchema } from '$lib/form-schema';
import { api, throwApiError } from '$lib/api';

export const load = async ({ params }) => {
  const groupId = getGroupId(params);

  const { data, error: apiError } = await api.internal['map-groups']({ id: groupId })[
    'maps-page'
  ].get();

  if (apiError || !data) {
    throwApiError(apiError, { 404: 'No group' });
  }

  const mapForm = await superValidate(zod4(insertMapsSchema));

  return {
    group: data.group,
    levelList: data.levelList,
    regionList: data.regionList,
    mapForm,
    user: data.user
  };
};

export const actions = {
  deleteMap: async ({ request }) => {
    const data = await request.formData();
    const mapId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(mapId)) {
      error(400, 'Invalid ID');
    }

    const { error: apiError } = await api.internal.maps.group({ id: mapId }).delete();

    if (apiError) {
      throwApiError(apiError, { 404: 'Map not found', 500: 'Failed to delete map' });
    }
  },

  updateMap: async ({ request }) => {
    const form = await superValidate(request, zod4(insertMapsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal.maps.group.put(form.data);

    if (apiError) {
      const status = apiError.status as number;
      const value = apiError.value as { message?: string } | undefined;
      if (status === 403) {
        if (value?.message) {
          return setError(form, 'geoguessrId', value.message);
        }
        error(403, 'Permission denied');
      }
      if (status === 409) {
        return setError(
          form,
          'geoguessrId',
          'This GeoGuessr ID is already used by another map. Please use a different ID.'
        );
      }
      console.error('Error updating/creating map:', apiError);
      return message(form, 'Something went wrong while saving the map. Please try again.', {
        status: 500
      });
    }
  }
};
