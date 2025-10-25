import { error, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { api } from '$lib/api';

const regenerateApiTokenSchema = z.object({
  newRawToken: z.string().optional()
});

export const load = async ({ locals }) => {
  const { data, error: apiError } = await api.internal.users.profile.get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });
  if (apiError) {
    error(500);
  }

  const hasApiToken = data.hasApiToken;

  const regenerateApiTokenForm = await superValidate(zod4(regenerateApiTokenSchema));

  return {
    hasApiToken,
    regenerateApiTokenForm
  };
};

export const actions = {
  regenerateApiToken: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(regenerateApiTokenSchema));
    if (!form.valid) {
      return fail(400, { form });
    }

    const { data, error: apiError } = await api.internal.users.profile['regenerate-api-token'].post(
      undefined,
      {
        headers: {
          'x-api-user-id': locals.user!.id
        }
      }
    );
    if (apiError) {
      error(500);
    }

    form.data.newRawToken = data.apiToken;
    form.message =
      'API Token generated successfully! Please copy it now, it will not be shown again.';
    return { form };
  }
};
