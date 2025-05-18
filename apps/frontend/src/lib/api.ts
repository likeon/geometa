import { treaty } from '@elysiajs/eden';
import type { App } from '$api';
import { env } from '$env/dynamic/private';

const apiHost = env.API_HOST || 'localhost:3000';
export const api = treaty<App>(`http://${apiHost}`).api;
