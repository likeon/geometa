import { treaty } from '@elysiajs/eden';
import { env } from '$env/dynamic/private';
import type { App } from '@api/api';
import type { RequestEvent } from '@sveltejs/kit';
const frontendToken = env.FRONTEND_API_TOKEN;
const prod = env.NODE_ENV === 'production';

const apiHost = env.API_HOST || 'localhost:3000';
// @ts-expect-error Elysia type mismatch between frontend and API node_modules
export const api = treaty<App>(`http://${apiHost}`, {
  headers(path) {
    if (prod && frontendToken && path.startsWith('/api/internal'))
      return {
        authorization: `Bearer ${frontendToken}`
      };
  }
}).api;

export function internalHeaders(locals: RequestEvent['locals']) {
  return {
    headers: {
      'x-api-user-id': locals.user!.id
    }
  };
}
