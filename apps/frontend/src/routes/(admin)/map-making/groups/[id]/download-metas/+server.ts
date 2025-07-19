import { api, internalHeaders } from '$lib/api';
import { getGroupId } from '../utils';
import { error } from '@sveltejs/kit';

export async function GET(event) {
  const groupId = getGroupId(event.params);

  const { data, error: apiError } = await api.internal['map-groups']({ id: groupId })[
    'download-metas'
  ].post({}, internalHeaders(event.locals));

  if (apiError) {
    console.error('Download Metas API Error:', apiError);
    error(500, 'Failed to download metas');
  }

  const jsonString = JSON.stringify(data.metas, null, 4);

  return new Response(jsonString, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${data.name}.json"`
    }
  });
}

export async function POST(event) {
  const groupId = getGroupId(event.params);
  const formData = await event.request.formData();
  const metaIds = formData
    .getAll('metaIds')
    .map((id) => parseInt(id.toString(), 10))
    .filter((id) => !isNaN(id));

  const { data, error: apiError } = await api.internal['map-groups']({ id: groupId })[
    'download-metas'
  ].post({ metaIds: metaIds.length > 0 ? metaIds : undefined }, internalHeaders(event.locals));

  if (apiError) {
    console.error('Download Metas API Error:', apiError);
    error(500, 'Failed to download metas');
  }

  const jsonString = JSON.stringify(data.metas, null, 4);

  return new Response(jsonString, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${data.name}.json"`
    }
  });
}
