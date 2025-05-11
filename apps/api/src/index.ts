import { Elysia } from 'elysia';
import { publicRouter } from '@/routes/public';

const app = new Elysia({prefix: '/api'})
  .use(publicRouter)
  .listen(3000);
export type App = typeof app;
