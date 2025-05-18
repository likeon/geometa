import { internalRouter } from '@/routes/internal';
import { userscriptRouter } from '@/routes/userscript';
import swagger from '@elysiajs/swagger';
import { logger } from '@lib/utils/log';
import { Elysia } from 'elysia';

const swaggerExclude = [/^\/api\/health-check/];

const swaggerServers = [];
if (process.env.NODE_ENV === 'production') {
  swaggerExclude.push(/^\/api\/internal/);
  swaggerServers.push({ url: 'https://learnablemeta.com' });
}

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
  .use(
    swagger({
      path: '/api/swagger',
      exclude: swaggerExclude,
      documentation: {
        info: { title: 'Learnable Meta API', version: '1' },
        servers: swaggerServers,
      },
    }),
  )
  .use(api)
  .listen(3000);
export type App = typeof app;
