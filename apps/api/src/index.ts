import { internalRouter } from '@/routes/internal';
import { userscriptRouter } from '@/routes/userscript';
import serverTiming from '@elysiajs/server-timing';
import swagger from '@elysiajs/swagger';
import { runMigrate } from '@lib/db/migrate';
import { logger } from '@lib/utils/log';
import { Elysia } from 'elysia';

const prod = process.env.NODE_ENV === 'production';
const swaggerExclude = [/^\/api\/health-check/];
const swaggerServers = [];
if (prod) {
  swaggerExclude.push(/^\/api\/internal/);
  swaggerServers.push({ url: 'https://learnablemeta.com' });
}

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});

const api = new Elysia({ prefix: '/api' })
  .use(logger())
  .use(serverTiming())
  .get('/health-check', ({ set }) => {
    set.status = 200;
    return 'ok';
  })
  .use(userscriptRouter)
  .use(internalRouter)
  .onError(({ set, code }) => {
    switch (code) {
      case 'VALIDATION':
      case 'PARSE':
        set.status = 400;
        break;
      case 'NOT_FOUND':
        set.status = 404;
        break;
      default:
        set.status = 500;
        return { message: 'Internal Server Error' };
    }
  });

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
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
  .use(api)
  .listen(3000);
export type App = typeof app;
