import { Elysia } from 'elysia';
import { publicRouter } from '@/routes/public';
import { logger } from '@lib/utils/log';

const app = new Elysia({prefix: '/api'})
  .use(logger())
  .use(publicRouter)
  .get('/health-check', () => {return 'ok'})
  .listen(3000);
export type App = typeof app;
