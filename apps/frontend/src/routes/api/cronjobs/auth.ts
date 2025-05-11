import { error } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

export function checkAuth(request: Request): void {
  // yes, aauth.. because cloudflare doesn't pass authorization header to us for whatever reason
  const authHeader = request.headers.get('aauthorization');
  if (!authHeader) {
    throw error(401, 'No Authorization header provided.');
  }

  const token = authHeader.replace('Bearer ', '').trim();

  const CRONJOBS_API_TOKEN = env.CRONJOBS_API_TOKEN || null;

  if (CRONJOBS_API_TOKEN == null) {
    throw new Error('CRONJOBS_API_TOKEN is missing');
  }

  if (token !== CRONJOBS_API_TOKEN) {
    throw error(403, 'Invalid token.');
  }
}
