import { auth } from '@api/lib/internal/auth';
import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { Elysia } from 'elysia';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(auth())
  .onRequest(({ request, set }) => {
    if (request.headers.get('cf-connecting-ip')) {
      set.status = 404;
      return;
    }
  })
  .use(mapGroupsRouter)
  .use(mapsRouter)
  .use(permissionErrorCatcher());
