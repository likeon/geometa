import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const proxyUrl = `https://geometa-info-service.i-a38.workers.dev/location-info${url.search}`;
  const response = await fetch(proxyUrl, {
    method: 'GET'
  });

  const data = await response.json();

  return json(data, {
    status: response.status
  });
}
