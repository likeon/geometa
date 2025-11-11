import { treaty } from '@elysiajs/eden';
import { env } from '$env/dynamic/private';
import type { App } from '@api/api';
import { getRequestEvent } from '$app/server';
const frontendToken = env.FRONTEND_API_TOKEN;
const prod = env.NODE_ENV === 'production';

const apiHost = env.API_HOST || 'localhost:3000';

// @ts-expect-error Elysia type mismatch between frontend and API node_modules
export const api = treaty<App>(`http://${apiHost}`, {
  headers(path) {
    const headers: Record<string, unknown> = {};
    if (prod && frontendToken && path.startsWith('/api/internal')) {
      headers.authorization = `Bearer ${frontendToken}`;
    }

    const ev = getRequestEvent();
    if (ev.locals.user) {
      headers['x-api-user-id'] = ev.locals.user.id;
    }

    return headers;
  }
}).api;
