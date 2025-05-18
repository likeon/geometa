import { Elysia } from 'elysia';
import { userscriptRouter } from '@/routes/userscript';
import { internalRouter } from '@/routes/internal';
import { logger } from '@lib/utils/log';
import swagger from '@elysiajs/swagger';

const api = new Elysia({ prefix: '/api' })
  .use(logger())
  .get('/health-check', () => {
    return 'ok';
  })
  .use(userscriptRouter)
  .use(internalRouter);

const app = new Elysia()
  // works around https://github.com/elysiajs/elysia/issues/1071
  // says it's fixed, but it's not
  .use(swagger({ path: '/api/swagger' }))
  .use(api)
  .listen(3000);
export type App = typeof app;
