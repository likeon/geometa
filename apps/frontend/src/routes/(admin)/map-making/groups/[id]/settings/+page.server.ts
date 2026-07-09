import { error, fail, redirect } from '@sveltejs/kit';
import { getGroupId } from '../utils';
import { z } from 'zod/v4';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { api } from '$lib/api';

const permissionDeleteSchema = z.object({
  permissionId: z.coerce.number().int()
});

const settingsSchema = z.object({
  syncIncludeLocationsNotOnStreetView: z.boolean()
});

const permissionCreateSchema = z.object({
  username: z.string().transform((val) => (val.startsWith('@') ? val.slice(1) : val))
});

export const load = async ({ params, locals }) => {
  const id = getGroupId(params);

  const { data, error: apiError } = await api.internal['map-groups']({ id })['settings-page'].get();

  if (apiError || !data) {
    const status = apiError?.status as number;
    if (status === 404) {
      error(404, 'No group');
    }
    if (status === 403) {
      error(403, 'Permission denied');
    }
    error(500, 'Something went wrong.');
  }
  const group = data.group;

  const permissionCreateForm = await superValidate(zod4(permissionCreateSchema));
  const settingsForm = await superValidate(
    { syncIncludeLocationsNotOnStreetView: group.syncIncludeLocationsNotOnStreetView },
    zod4(settingsSchema)
  );
  return {
    group,
    user: locals.user!,
    permissionCreateForm,
    settingsForm
  };
};

export const actions = {
  deleteGroup: async ({ request }) => {
    const data = await request.formData();
    const groupIdRaw = data.get('id');
    if (!groupIdRaw) {
      return fail(400);
    }
    const groupId = parseInt(groupIdRaw as string);

    const { error: apiError } = await api.internal['map-groups']({ id: groupId }).delete();

    if (apiError) {
      const status = apiError.status as number;
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to delete group');
    }
    redirect(303, '/map-making');
  },
  deletePermission: async ({ request, params }) => {
    const groupId = getGroupId(params);
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    const parsed = permissionDeleteSchema.safeParse(rawData);
    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      return fail(400, {
        errors: fieldErrors,
        formData: rawData
      });
    }

    const { error: apiError } = await api.internal['map-groups']({ id: groupId })
      .permissions({ permissionId: parsed.data.permissionId })
      .delete();

    if (apiError) {
      const status = apiError.status as number;
      const value = apiError.value as { field?: string; message?: string } | undefined;
      if (status === 400 && value?.message) {
        return fail(400, {
          errors: { permissionId: [value.message] },
          formData: rawData
        });
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to delete permission');
    }

    return {
      success: true
    };
  },
  createPermission: async ({ request, params }) => {
    const groupId = getGroupId(params);
    const form = await superValidate(request, zod4(permissionCreateSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal['map-groups']({ id: groupId }).permissions.post({
      username: form.data.username
    });

    if (apiError) {
      const status = apiError.status as number;
      const value = apiError.value as { field?: string; message?: string } | undefined;
      if (status === 400 && value?.message) {
        return setError(form, 'username', value.message);
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to create permission');
    }
  },
  updateSettings: async ({ params, request }) => {
    const form = await superValidate(request, zod4(settingsSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal['map-groups']({
      id: getGroupId(params)
    }).settings.post(form.data);
    if (apiError) {
      // todo: handle 403 and 404
      throw new Error('unexpected api error');
    }
  }
};
