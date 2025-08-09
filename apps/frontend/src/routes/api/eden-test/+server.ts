import { api } from '$lib/api';
import { json } from '@sveltejs/kit';

export async function GET({ request: _request }) {
  console.debug(await api['health-check'].get());
  return json({});
}
