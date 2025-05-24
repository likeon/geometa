import { auth } from '@api/lib/internal/auth';
import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { Elysia } from 'elysia';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';
import { personalMapsRouter } from './personal';

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(auth())
  .use(mapGroupsRouter)
  .use(mapsRouter)
  .use(personalMapsRouter)
  .use(permissionErrorCatcher());
