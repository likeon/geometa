import { error } from '@sveltejs/kit';
import { getGroupId } from '../utils';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { insertLevelsSchema } from '$lib/form-schema';
import { api, throwApiError } from '$lib/api';

export const load = async ({ params }) => {
  const id = getGroupId(params);

  const { data, error: apiError } = await api.internal['map-groups']({ id })['levels-page'].get();

  if (apiError || !data) {
    throwApiError(apiError, { 404: 'No group' });
  }

  const levelForm = await superValidate(zod4(insertLevelsSchema));
  return {
    group: data.group,
    levelForm
  };
};

export const actions = {
  deleteLevel: async ({ request, params }) => {
    const groupId = getGroupId(params);
    const data = await request.formData();
    const levelId = parseInt((data.get('id') as string) || '', 10);

    if (isNaN(levelId)) {
      error(400, 'Invalid ID');
    }

    const { error: apiError } = await api.internal['map-groups']({ id: groupId })
      .levels({ levelId })
      .delete();

    if (apiError) {
      throwApiError(apiError, { 404: 'Level not found', 500: 'Failed to delete level' });
    }
  },

  updateLevel: async ({ request, params }) => {
    const mapGroupId = getGroupId(params);
    const form = await superValidate(request, zod4(insertLevelsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal['map-groups']({ id: mapGroupId }).levels.put({
      id: form.data.id,
      name: form.data.name
    });

    if (apiError) {
      throwApiError(apiError, { 500: 'Failed to save level' });
    }
  }
};
