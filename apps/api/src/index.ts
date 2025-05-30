import { runMigrate } from '@api/lib/db/migrate';
import { prod } from '@api/lib/utils/env';
import { logger } from '@api/lib/utils/log';
import { sentry } from '@api/lib/utils/sentry';
import serverTiming from '@elysiajs/server-timing';
import swagger from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { internalRouter } from './routes/internal';
import { userscriptRouter } from './routes/userscript';

const swaggerExclude = [/^\/api\/health-check/];
const swaggerServers = [];
if (prod) {
  swaggerExclude.push(/^\/api\/internal/);
  swaggerServers.push({ url: 'https://learnablemeta.com' });
}

if (prod) {
  runMigrate().catch((err) => {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  });
}

const api = new Elysia({ prefix: '/api' })
  .use(sentry())
  .use(logger())
  .use(serverTiming())
  .get('/health-check', () => {
    return 'ok';
  })
  .use(userscriptRouter)
  .use(internalRouter)
  .onError(({ set, code }) => {
    if (code === 'INTERNAL_SERVER_ERROR' || code === 'UNKNOWN') {
      set.status = 500;
      return { message: 'Internal Server Error' };
    }
  });

const app = new Elysia()
  // works around https://github.com/elysiajs/elysia/issues/1071
  // says it's fixed, but it's not
  .use(
    swagger({
      path: '/api/docs',
      exclude: swaggerExclude,
      documentation: {
        info: { title: 'Learnable Meta API', version: '1' },
        servers: swaggerServers,
      },
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
  .use(api)
  .listen(3000);
export type App = typeof app;
