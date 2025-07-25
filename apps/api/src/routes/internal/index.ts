import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { Elysia } from 'elysia';
import { discordBotRouter } from './discord-bot';
import { mapGroupsRouter } from './map-groups';
import { mapsRouter } from './maps';
import { metasRouter } from './metas';
import { usersRouter } from './users';

export const internalRouter = new Elysia({
  prefix: '/internal',
  detail: { tags: ['internal'] },
})
  .use(mapGroupsRouter)
  .use(mapsRouter)
  .use(metasRouter)
  .use(usersRouter)
  .use(discordBotRouter)
  .use(permissionErrorCatcher());
