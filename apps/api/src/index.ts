import { runMigrate } from '@api/lib/db/migrate';
import { prod } from '@api/lib/utils/env';
import { logger } from '@api/lib/utils/log';
import { sentry } from '@api/lib/utils/sentry';
import serverTiming from '@elysiajs/server-timing';
import swagger from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { internalRouter } from './routes/internal';
import { mapsRouter } from './routes/maps';
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

const app = new Elysia({ prefix: '/api', serve: { idleTimeout: 60 } })
  .use(sentry())
  .use(logger())
  .use(serverTiming())
  .get('/health-check', () => {
    return 'ok';
  })
  .use(
    swagger({
      path: '/docs',
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
  .use(userscriptRouter)
  .use(internalRouter)
  .use(mapsRouter)
  .onError(({ set, code }) => {
    if (code === 'INTERNAL_SERVER_ERROR' || code === 'UNKNOWN') {
      set.status = 500;
      return { message: 'Internal Server Error' };
    }
  })
  .listen(parseInt(process.env.SERVER_PORT || '3000'));

export type App = typeof app;

const gracefulShutdown = async () => {
  await app.stop();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
