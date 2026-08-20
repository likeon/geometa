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

export const app = new Elysia({
  prefix: '/api',
  serve: { idleTimeout: 60 },
  handler: { standardHostname: false },
})
  .use(sentry())
  .use(logger())
  .use(serverTiming())
  .onError(({ code, status }) => {
    switch (code) {
      case 'INTERNAL_SERVER_ERROR':
      case 'UNKNOWN':
        return status(500, { message: 'Internal Server Error' });
      default:
        break;
    }
  })
  .get('/health-check', () => {
    return 'ok';
  })
  .use(
    swagger({
      path: '/docs',
      exclude: swaggerExclude,
      documentation: {
        info: {
          title: 'Learnable Meta API',
          version: '1',
          description:
            'Public endpoints used by the LearnableMeta userscript and map-making tools.',
        },
        servers: swaggerServers,
        externalDocs: {
          description: 'LearnableMeta documentation',
          url: 'https://docs.learnablemeta.com/',
        },
        tags: [
          { name: 'Maps', description: 'Browse published LearnableMeta maps.' },
          {
            name: 'Userscript',
            description:
              'Runtime data consumed by the LearnableMeta userscript.',
          },
          {
            name: 'Map making tools',
            description:
              'Authenticated map manifests and location exports for map-making integrations.',
          },
        ],
        components: {
          securitySchemes: {
            learnableMetaToken: {
              type: 'http',
              scheme: 'bearer',
              description:
                'A LearnableMeta API token from https://learnablemeta.com/profile/token.',
            },
          },
        },
      },
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
  .use(userscriptRouter)
  .use(internalRouter)
  .use(mapsRouter);

export type App = typeof app;
