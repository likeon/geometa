import { treaty } from '@elysiajs/eden';
import type { App } from '$api';
import { env } from '$env/dynamic/private';
const frontendToken = process.env.FRONTEND_API_TOKEN;
const prod = process.env.NODE_ENV === 'production';

const apiHost = env.API_HOST || 'localhost:3000';
export const api = treaty<App>(`http://${apiHost}`, {
  headers(path) {
    if (prod && frontendToken && path.startsWith('/api/internal'))
      return {
        authorization: `Bearer ${frontendToken}`
      };
  }
}).api;
