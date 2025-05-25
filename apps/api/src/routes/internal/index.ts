import { auth } from '@api/lib/internal/auth';
import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { Elysia } from 'elysia';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';
import {personalMapsRouter} from "@api/routes/internal/personal";

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(auth())
  .use(mapGroupsRouter)
  .use(personalMapsRouter)
  .use(mapsRouter)
  .use(permissionErrorCatcher());
