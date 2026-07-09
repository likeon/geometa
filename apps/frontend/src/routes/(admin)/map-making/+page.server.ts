import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { insertMapGroupSchema, updateMapGroupSchema } from '$lib/form-schema';
import { api } from '$lib/api';

export const prerender = false;

export const load = async () => {
  const { data, error: apiError } = await api.internal['map-groups'].get();

  if (apiError || !data) {
    error(500, 'Something went wrong.');
  }

  const mapGroupForm = await superValidate(zod4(insertMapGroupSchema));
  return { userGroups: data.userGroups, allGroups: data.allGroups, mapGroupForm };
};

export const actions = {
  createGroup: async ({ request }) => {
    const form = await superValidate(request, zod4(insertMapGroupSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { data, error: apiError } = await api.internal['map-groups'].post({
      name: form.data.name
    });

    if (apiError || !data) {
      return fail(500, { form });
    }
    throw redirect(303, `/map-making/groups/${data.id}`);
  },
  updateGroupName: async ({ request }) => {
    const form = await superValidate(request, zod4(updateMapGroupSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal['map-groups']({ id: form.data.id }).patch({
      name: form.data.name
    });

    if (apiError) {
      error((apiError.status as number) === 403 ? 403 : 500, 'Failed to update group name');
    }
  },
  lookupMapGroup: async ({ request }) => {
    const formData = await request.formData();
    const geoguessrId = formData.get('geoguessrId') as string;

    if (!geoguessrId) {
      return fail(400, { error: 'GeoGuessr ID is required' });
    }

    const { data, error: apiError } = await api.internal.maps.mapgroup({ geoguessrId }).get();

    if (apiError || !data) {
      const errorMessage = typeof apiError?.value === 'string' ? apiError.value : 'Map not found';

      return fail(apiError?.status || 404, {
        error: errorMessage
      });
    }

    return { mapGroup: data };
  }
};
