import { prod } from '@api/lib/utils/env';
import { logger } from '@api/lib/utils/log';
import { sentry } from '@api/lib/utils/sentry';
import { openapi } from '@elysia/openapi';
import serverTiming from '@elysiajs/server-timing';
import { Elysia } from 'elysia';
import { internalRouter } from './routes/internal';
import { mapsRouter } from './routes/maps';
import { userscriptRouter } from './routes/userscript';

const openApiServers = prod ? [{ url: 'https://learnablemeta.com' }] : [];

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
    openapi({
      path: '/docs',
      specPath: '/docs/json',
      provider: prod ? null : 'scalar',
      scalar: {
        hideClientButton: true,
        showToolbar: 'never',
        theme: 'elysiajs',
      },
      exclude: {
        paths: ['/api/health-check'],
        tags: prod ? ['internal'] : [],
      },
      documentation: {
        info: {
          title: 'Learnable Meta API',
          version: '1',
        },
        servers: openApiServers,
        externalDocs: {
          description: 'Learnable Meta documentation',
          url: 'https://learnablemeta.com/docs',
        },
        tags: [
          {
            name: 'Maps',
            description: 'Browse published Learnable Meta maps.',
          },
          {
            name: 'Userscript',
            description:
              'Runtime data consumed by the Learnable Meta userscript.',
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
                'A Learnable Meta API token from https://learnablemeta.com/profile/token.',
            },
          },
        },
      },
    }),
  )
  .use((app) => {
    if (prod) {
      app.get(
        '/docs',
        () =>
          new Response(null, {
            status: 308,
            headers: { location: '/docs/api' },
          }),
        { detail: { hide: true } },
      );
    }
    return app;
  })
  .use(userscriptRouter)
  .use(internalRouter)
  .use(mapsRouter);

export type App = typeof app;
