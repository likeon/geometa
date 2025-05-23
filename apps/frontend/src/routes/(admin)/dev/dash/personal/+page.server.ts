import { api } from '$lib/api';
import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';

export const prerender = false;

const insertPersonalMap = z.object({
  id: z.number().nullable(),
  name: z.string(),
  geoguessrId: z.string()
});
export type InsertPersonalMapSchema = typeof insertPersonalMap;

export const load: PageServerLoad = async ({ locals }) => {
  const personalMapsResult = await api.internal.maps.personal.get({
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });
  // todo: remove ! and do it better way (?)
  const personalMaps = personalMapsResult.data!;

  const personalMapForm = await superValidate(zod(insertPersonalMap));
  return { personalMaps, personalMapForm };
};

export const actions = {
  createPersonalMap: async ({ request, locals }) => {
    const form = await superValidate(request, zod(insertPersonalMap));

    if (!form.valid) {
      return fail(400, { form });
    }
    const insertedPersonalMapResult = await api.internal.maps.personal.post(
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
    console.log(insertedPersonalMapResult);

    if (insertedPersonalMapResult.status === 200) {
      return {
        form,
        success: true,
        mapId: insertedPersonalMapResult.data.id
      };
    } else if (insertedPersonalMapResult.status === 409) {
      form.errors.geoguessrId = ['A map with this GeoGuessr ID already exists in our system'];
      return fail(409, { form });
    } else {
      return fail(500, {
        form,
        message: 'Failed to create map. Please try again later.'
      });
    }
  },
  updatePersonalMapName: async ({ request, locals }) => {
    const form = await request.formData();
    const name = form.get('name');

    if (!name || typeof name !== 'string') {
      console.log("here");
     return fail(400, {
        message: 'Name cannot be empty.'
      });
    }
// todo: check if request went properly
 await api.internal.maps.personal[form.get('id')].patch({
  name
 },{
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });

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
// todo: check if request went properly
console.log(geoguessrId);
 await api.internal.maps.personal[form.get('id')].patch({
  geoguessrId: geoguessrId
 },{
    headers: {
      'x-api-user-id': locals.user!.id
    }
  });

    return { success: true };
  }
};
