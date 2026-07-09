import { error, fail } from '@sveltejs/kit';
import { message, setError, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { extractJsonData } from '$lib/utils';
import { getGroupId } from './utils';
import { api } from '$lib/api';
import {
  insertMetasSchema,
  mapUploadSchema,
  metasUploadContentSchema,
  metasUploadSchema
} from '$lib/form-schema';

const imageUploadSchema = z.object({
  metaId: z.number(),
  file: z.instanceof(File, {
    error: 'Please upload an image'
  })
});
export type ImageUploadSchema = typeof imageUploadSchema;

const imageOrderUpdateSchema = z.object({
  metaId: z.number(),
  updates: z
    .array(
      z.object({
        imageId: z.number(),
        order: z.number()
      })
    )
    .min(1, 'At least one image update is required')
});
export type ImageOrderUpdateSchema = typeof imageOrderUpdateSchema;

const copyMetaSchema = z.object({
  metaId: z.number(),
  mapGroupIdToCopy: z.number()
});

export type CopyMetaSchema = typeof copyMetaSchema;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- data is validated by Zod schema immediately after this function
function normalizeMapJsonFormat(jsonData: any) {
  if (Array.isArray(jsonData)) {
    return { customCoordinates: jsonData };
  }
  return jsonData;
}

const mapJsonSchema = z.object({
  customCoordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
      heading: z.number(),
      pitch: z.number(),
      zoom: z.number(),
      panoId: z.string().nullable(),
      extra: z.object({
        tags: z.string().array().length(1),
        panoId: z.string().optional().nullable(),
        panoDate: z.string().optional().nullable()
      })
    })
    .refine((coord) => coord.panoId != null || coord.extra.panoId != null, {
      message: 'missing panoId',
      path: ['panoId']
    })
    .array()
    .superRefine((coordinates, ctx) => {
      const panoIds = coordinates.map((coord) => coord.panoId ?? coord.extra.panoId);
      const uniquePanoIds = new Set(panoIds);

      if (panoIds.length !== uniquePanoIds.size) {
        const duplicateCount = panoIds.length - uniquePanoIds.size;
        ctx.addIssue({
          code: 'custom',
          path: ['duplicates'],
          message: `Duplicate locations found (${duplicateCount} total). Use <a href="https://map-making.app/" target="_blank" class="underline hover:text-primary">map-making.app</a> to find duplicates and remove them.`
        });
      }
    })
});
export const load = async ({ params, locals }) => {
  if (!locals.user?.id) {
    error(403, 'Permission denied');
  }
  const id = getGroupId(params);
  const { data, error: apiError } = await api.internal['map-groups']({ id }).page.get();

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
  const { group, user } = data;

  const locationsNotOnStreetViewCount = api.internal['locations'].count
    .get({ query: { groupId: group.id, isOnStreetView: false } })
    .then((res) => res.data!.count);

  const metaForm = await superValidate(zod4(insertMetasSchema));
  const mapUploadForm = await superValidate(zod4(mapUploadSchema));
  const metasUploadForm = await superValidate(zod4(metasUploadSchema));
  const imageUploadForm = await superValidate(zod4(imageUploadSchema));
  const imageOrderUpdateForm = await superValidate(zod4(imageOrderUpdateSchema));
  const copyForm = await superValidate(zod4(copyMetaSchema));

  return {
    group,
    locationsNotOnStreetViewCount,
    metaForm,
    mapUploadForm,
    metasUploadForm,
    imageUploadForm,
    imageOrderUpdateForm,
    user,
    copyForm
  };
};

export const actions = {
  updateMeta: async ({ request }) => {
    const form = await superValidate(request, zod4(insertMetasSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { error: apiError } = await api.internal.metas.put(form.data);

    if (apiError) {
      const status = apiError.status as number;
      if (status === 409) {
        return setError(
          form,
          'tagName',
          'A meta with this tag name already exists in this map group'
        );
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      if (status === 404) {
        error(404, 'Meta not found');
      }
      error(500, 'Failed to save meta');
    }
  },
  deleteMetas: async ({ request }) => {
    const data = await request.formData();
    const idsRaw = data.getAll('id');
    const ids = idsRaw
      .flatMap((val) => (Array.isArray(val) ? val : [val]))
      .map((id) => parseInt(id as string, 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      error(400, 'No valid IDs provided');
    }

    const { error: apiError } = await api.internal.metas.delete({ ids });

    if (apiError) {
      const status = apiError.status as number;
      const message = typeof apiError.value === 'string' ? apiError.value : undefined;
      if (status === 404) {
        error(404, message || 'Some metas not found');
      }
      if (status === 400) {
        error(400, message || 'All metas must belong to the same map group');
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to delete metas');
    }
  },
  addLevels: async ({ request }) => {
    const formData = await request.formData();
    const metaIds = formData.getAll('metaIds').map((id) => Number(id));
    const levelIds = formData.getAll('levelIds').map((id) => Number(id));

    if (!metaIds.length || !levelIds.length) {
      return fail(400, { message: 'No metas or levels selected' });
    }

    const { data, error: apiError } = await api.internal.metas.levels.post({ metaIds, levelIds });

    if (apiError || !data) {
      const status = apiError?.status as number;
      const value = apiError?.value as { message?: string } | undefined;
      if (status === 404 || status === 400) {
        return fail(status, { message: value?.message || 'Failed to add levels to metas' });
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      return fail(500, { message: 'Failed to add levels to metas' });
    }

    return {
      success: true,
      message: data.message,
      addedCount: data.addedCount
    };
  },
  shareMetas: async ({ request }) => {
    const formData = await request.formData();
    const metaIds = formData.getAll('metaIds').map((id) => Number(id));
    const targetGroupId = Number(formData.get('targetGroupId'));

    if (!metaIds.length || !targetGroupId) {
      return fail(400, { message: 'Invalid request data' });
    }

    const { data, error: apiError } = await api.internal.metas.share.post({
      metaIds,
      targetGroupId
    });

    if (apiError || !data) {
      const status = apiError?.status as number;
      const value = apiError?.value as { message?: string } | undefined;
      if (status === 404) {
        return fail(404, { message: value?.message || 'No metas found for the provided IDs' });
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      return fail(500, { message: 'Failed to share metas' });
    }

    return {
      success: true,
      copiedCount: data.copiedCount,
      totalRequested: data.totalRequested,
      message: data.message
    };
  },
  copyMetaTo: async ({ request }) => {
    const form = await superValidate(request, zod4(copyMetaSchema));
    if (!form.valid) {
      return fail(400, { form });
    }
    const { metaId, mapGroupIdToCopy } = form.data;

    const { error: apiError } = await api.internal.metas.copy.post({
      metaId,
      targetGroupId: mapGroupIdToCopy
    });

    if (apiError) {
      const status = apiError.status as number;
      if (status === 404) {
        error(400, 'No meta found for this id');
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to copy meta');
    }
  },
  uploadMapJson: async ({ request, params }) => {
    const groupId = getGroupId(params);
    const form = await superValidate(request, zod4(mapUploadSchema), { id: 'mapUpload' });
    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    let jsonData;
    try {
      const rawJsonData = await extractJsonData(form.data.file);
      jsonData = normalizeMapJsonFormat(rawJsonData);
    } catch (_error) {
      return setError(
        form,
        'file',
        'Invalid JSON file format. Please check for unescaped special characters.'
      );
    }
    const validationResult = mapJsonSchema.safeParse(jsonData);

    if (!validationResult.success) {
      const processedErrors = validationResult.error.issues.map((issue) => {
        let message: string = issue.message;

        if (issue.path.includes('tags')) {
          // Extract panoId from the location object using the path
          const locationIndex = issue.path[1] as number; // customCoordinates[index]
          const location = jsonData.customCoordinates?.[locationIndex];
          const panoId = location?.panoId || location?.extra?.panoId || null;
          const locationNumber = locationIndex + 1;
          if (issue.code === 'too_small' || issue.message === 'Required') {
            message = `doesn't have a tag`;
          } else if (issue.code === 'too_big') {
            message = `has more than one tag`;
          }

          // Return HTML with link if panoId exists
          if (panoId) {
            const sanitizedPanoId = panoId.replace(/[^a-zA-Z0-9_-]/g, '');
            return `<a href="https://maps.google.com/maps?q=&layer=c&panoid=${encodeURIComponent(sanitizedPanoId)}" target="_blank" class="underline hover:text-primary">Location ${locationNumber}</a> ${message}`;
          } else {
            return `Location ${locationNumber} ${message}`;
          }
        } else if (issue.path.includes('duplicates')) {
          return message;
        } else if (issue.path.includes('panoId') && issue.message === 'missing panoId') {
          const locationIndex = issue.path[1] as number;
          const location = jsonData.customCoordinates?.[locationIndex];
          const locationNumber = locationIndex + 1;
          if (location?.lat != null && location?.lng != null) {
            return `<a href="https://maps.google.com/maps?q=${location.lat},${location.lng}" target="_blank" class="underline hover:text-primary">Location ${locationNumber}</a> doesn't have panoId`;
          }
          return `Location ${locationNumber} doesn't have panoId`;
        }

        return message;
      });
      return setError(form, 'file', processedErrors);
    }

    const locations = validationResult.data.customCoordinates.map((location) => ({
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      pitch: location.pitch,
      zoom: location.zoom,
      panoId: location.panoId ?? location.extra.panoId!,
      extraTag: location.extra.tags[0],
      extraPanoId: location.extra.panoId || null,
      extraPanoDate: location.extra.panoDate
    }));

    const { data, error: apiError } = await api.internal['map-groups']({
      id: groupId
    }).locations.upload.post({ uploadMode: form.data.uploadMode, locations });

    if (apiError || !data) {
      const status = apiError?.status as number;
      if (status === 409) {
        return setError(
          form,
          'file',
          'The uploaded file contains duplicate panoId values. Please remove duplicates and try again.'
        );
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to upload locations');
    }

    return message(form, { numberOfLocations: data.count });
  },
  uploadMetas: async ({ request, params }) => {
    const groupId = getGroupId(params);
    const form = await superValidate(request, zod4(metasUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }
    let jsonData;
    try {
      jsonData = await extractJsonData(form.data.file);
    } catch (_error) {
      return setError(
        form,
        'file',
        'Invalid JSON file format. Please check for unescaped special characters.'
      );
    }
    const validationResult = metasUploadContentSchema.safeParse(jsonData);

    if (!validationResult.success) {
      return setError(form, 'file', 'Validation failed');
    }

    // Check for duplicate tagNames
    const tagNameCounts = new Map<string, number>();
    for (const item of validationResult.data!) {
      const count = tagNameCounts.get(item.tagName) || 0;
      tagNameCounts.set(item.tagName, count + 1);
    }

    const duplicates = Array.from(tagNameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([tagName, count]) => `${tagName} (${count} times)`);

    if (duplicates.length > 0) {
      return setError(
        form,
        'file',
        `Duplicate tagNames found: ${duplicates.join(', ')}. Each tagName must be unique.`
      );
    }

    const { error: apiError } = await api.internal['map-groups']({ id: groupId }).metas.upload.post(
      {
        partialUpload: form.data.partialUpload,
        autoCreateLevels: form.data.autoCreateLevels,
        metas: validationResult.data
      }
    );

    if (apiError) {
      const status = apiError.status as number;
      const value = apiError.value as { message?: string } | undefined;
      if (status === 400 && value?.message?.startsWith('Missing levels:')) {
        return setError(form, 'file', value.message);
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to upload metas');
    }
  },
  uploadMetaImages: async ({ request }) => {
    const form = await superValidate(request, zod4(imageUploadSchema));

    if (!form.valid) {
      return fail(400, withFiles({ form }));
    }

    const { data, status } = await api.internal
      .metas({ id: form.data.metaId })
      .images.post({ file: form.data.file });

    switch (status) {
      case 200:
        return message(form, data!.imageUrl);
      case 400:
        return setError(form, 'file', 'Failed to process the image');
      default:
        console.debug(status);
        throw new Error('unexpected response');
    }
  },
  deleteMetaImage: async ({ request }) => {
    const data = await request.formData();
    const imageId = parseInt((data.get('imageId') as string) || '', 10);
    if (isNaN(imageId)) {
      error(400, 'Invalid ID');
    }

    const { error: apiError } = await api.internal.metas.images({ imageId }).delete();

    if (apiError) {
      const status = apiError.status as number;
      if (status === 404) {
        error(404, 'Image not found');
      }
      if (status === 403) {
        error(403, 'Permission denied');
      }
      error(500, 'Failed to delete image');
    }
    return { success: true, imageId: imageId };
  },
  updateImageOrder: async ({ request }) => {
    const form = await superValidate(request, zod4(imageOrderUpdateSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Call the internal API to update image order
    const { error: apiError } = await api.internal
      .metas({ id: form.data.metaId })
      .images.order.put({ updates: form.data.updates });

    if (apiError) {
      console.error('Failed to update image order:', apiError);
      return setError(form, '', 'Failed to update image order');
    }

    return message(form, 'Image order updated successfully');
  },
  prepareUserScriptData: async (event) => {
    const groupId = getGroupId(event.params);
    // make it so every request has this user id as header
    const { error: apiError } = await api.internal['map-groups']({ id: groupId }).sync.post(
      undefined,
      {
        headers: {
          'x-api-user-id': event.locals.user!.id
        }
      }
    );
    if (apiError) {
      error(500);
    }
  }
};
