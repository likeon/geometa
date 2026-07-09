import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { Elysia } from 'elysia';
import { discordBotRouter } from './discord-bot';
import { locationsRouter } from './locations';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';
import { metasRouter } from './metas';
import { usersRouter } from './users';

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  // must be registered before the routers so the error hook applies to them
  .use(permissionErrorCatcher())
  .use(mapGroupsRouter)
  .use(mapsRouter)
  .use(metasRouter)
  .use(usersRouter)
  .use(discordBotRouter)
  .use(locationsRouter);
