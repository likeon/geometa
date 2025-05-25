import { auth } from '@api/lib/internal/auth';
import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { personalMapsRouter } from '@api/routes/internal/personal';
import { Elysia } from 'elysia';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(auth())
  .use(mapGroupsRouter)
  .use(personalMapsRouter)
  .use(mapsRouter)
  .use(permissionErrorCatcher());
