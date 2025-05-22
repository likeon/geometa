import { treaty } from '@elysiajs/eden';
import { env } from '$env/dynamic/private';
import type { App } from '@/index';
const frontendToken = env.FRONTEND_API_TOKEN;
const prod = env.NODE_ENV === 'production';

const apiHost = env.API_HOST || 'localhost:3000';
export const api = treaty<App>(`http://${apiHost}`, {
  headers(path) {
    if (prod && frontendToken && path.startsWith('/api/internal'))
      return {
        authorization: `Bearer ${frontendToken}`
      };
  }
}).api;
