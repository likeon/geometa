import { permissionErrorCatcher } from '@api/lib/internal/permissions';
import { streetViewFromPanoid } from '@api/lib/utils/google';
import { Elysia, t } from 'elysia';
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
  .get(
    '/pano',
    async ({ query: { panoId } }) => {
      const result = await streetViewFromPanoid(panoId);
      return result;
    },
    {
      query: t.Object({ panoId: t.String() }),
    },
  )
  .use(permissionErrorCatcher());
