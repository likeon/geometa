import { edenTreaty } from '@elysiajs/eden';
import type { App } from '$api/index.js';
import { env } from '$env/dynamic/private';

const apiHost = env.API_HOST || 'localhost:3000';
export const api = edenTreaty<App>(`http://${apiHost}`).api;
