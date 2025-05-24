import { api } from '$lib/api';
import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { error, fail } from '@sveltejs/kit';

export const prerender = false;

const insertPersonalMap = z.object({
  id: z.number().nullable(),
  name: z.string(),
  geoguessrId: z.string()
});
export type InsertPersonalMapSchema = typeof insertPersonalMap;

export const load: PageServerLoad = async ({ locals }) => {
  const { data, error: apiError } = await api.internal.maps.personal.get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });

  if (apiError) {
    switch (apiError.status) {
      default:
        error(500, 'Something went wrong.');
    }
  }

  const personalMapForm = await superValidate(zod(insertPersonalMap));
  return { personalMaps: data, personalMapForm };
};

export const actions = {
  createPersonalMap: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertPersonalMap));

    if (!form.valid) {
      return fail(400, { form });
    }
    const { data, error: apiError } = await api.internal.maps.personal.post(
      {
        name: form.data.name,
        geoguessrId: form.data.geoguessrId
      },
      {
        headers: {
          'x-api-user-id': locals.user!.id
        }
      }
    );

    if (apiError) {
      switch (apiError.status) {
        case 409:
          form.errors.geoguessrId = ['A map with this GeoGuessr ID already exists in our system'];
          return fail(409, { form });
        default:
          return fail(500, {
            form,
            message: 'Failed to create map. Please try again later.'
          });
      }
    }

    return {
      form,
      success: true,
      mapId: data.id
    };
  },
  updatePersonalMapName: async ({ request, locals }) => {
    const form = await request.formData();
    const name = form.get('name');

    if (!name || typeof name !== 'string') {
      console.log('here');
      return fail(400, {
        message: 'Name cannot be empty.'
      });
    }

    // check if id was provided in form, it should always be but checking anyways
    const idRaw = form.get('id');
    const id = Number(idRaw);
    if (!idRaw || isNaN(id)) {
      error(400, 'Invalid or missing ID');
    }

    const { data, error: apiError } = await api.internal.maps.personal({ id }).patch(
      {
        name
      },
      {
        headers: {
          'x-api-user-id': locals.user!.id
        }
      }
    );

    if (apiError) {
      switch (apiError.status) {
        default:
          return fail(500, {
            form,
            message: 'Failed to create map. Please try again later.'
          });
      }
    }

    return { success: true };
  },

  updatePersonalMapGeoguessrId: async ({ request, locals }) => {
    const form = await request.formData();
    const geoguessrId = form.get('geoguessrId');

    if (!geoguessrId || typeof geoguessrId !== 'string') {
      return fail(400, {
        message: 'Geoguessrid cannot be empty.'
      });
    }
  
  // check if id was provided in form, it should always be but checking anyways
    const idRaw = form.get('id');
    const id = Number(idRaw);
    if (!idRaw || isNaN(id)) {
      error(400, 'Invalid or missing ID');
    }

    const {data, error:apiError} = await api.internal.maps.personal({id}).patch(
      {
        geoguessrId: geoguessrId
      },
      {
        headers: {
          'x-api-user-id': locals.user!.id
        }
      }
    );

   if (apiError) {
      switch (apiError.status) {
        default:
          return fail(500, {
            form,
            message: 'Failed to create map. Please try again later.'
          });
      }
    }

    return { success: true };
  }
};
