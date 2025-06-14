import {
  locationRequestLogs,
  mapGroups,
  maps,
  metas,
  syncedMetas,
} from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { auth } from '@api/lib/internal/auth';
import { ensurePermissions } from '@api/lib/internal/permissions';
import { syncMapGroup } from '@api/lib/internal/sync';
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

export const mapGroupsRouter = new Elysia({ prefix: '/map-groups' })
  .use(auth())
  .post(
    '/:id/sync',
    async ({ params: { id: groupId }, userId, status }) => {
      await ensurePermissions(userId, groupId);
      const group = await db.query.mapGroups.findFirst({
        where: eq(mapGroups.id, groupId),
      });
      if (!group) {
        return status(404);
      }
      await syncMapGroup(group);
      return;
    },
    {
      params: t.Object({ id: t.Integer() }),
      userId: true,
    },
  )
  .get(
    '/:id/location-requests',
    async ({ params: { id: mapGroupId }, query, userId }) => {
      await ensurePermissions(userId, mapGroupId);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - query.days);

      const results = await db
        .select({
          syncedMetaId: locationRequestLogs.syncedMetaId,
          metaName: syncedMetas.name,
          metaTag: metas.tagName,
          day: sql<string>`DATE(${locationRequestLogs.timestamp})`.as('day'),
          // Cast COUNT() to int because PostgreSQL COUNT() returns bigint,
          // which Drizzle serializes as string. ::int ensures JavaScript number.
          personalMapCount:
            sql<number>`(COUNT(*) FILTER (WHERE ${maps.isPersonal} = true))::int`.as(
              'personal_map_count',
            ),
          regularMapCount:
            sql<number>`(COUNT(*) FILTER (WHERE ${maps.isPersonal} = false))::int`.as(
              'regular_map_count',
            ),
        })
        .from(locationRequestLogs)
        .innerJoin(maps, eq(maps.id, locationRequestLogs.mapId))
        .innerJoin(
          syncedMetas,
          eq(syncedMetas.metaId, locationRequestLogs.syncedMetaId),
        )
        .innerJoin(metas, eq(metas.id, syncedMetas.metaId))
        .where(
          and(
            eq(syncedMetas.mapGroupId, mapGroupId),
            gte(locationRequestLogs.timestamp, daysAgo),
            isNotNull(locationRequestLogs.syncedMetaId),
          ),
        )
        .groupBy(
          locationRequestLogs.syncedMetaId,
          syncedMetas.name,
          metas.tagName,
          sql`DATE(${locationRequestLogs.timestamp})`,
        )
        .orderBy(
          locationRequestLogs.syncedMetaId,
          sql`DATE(${locationRequestLogs.timestamp})`,
        );
      // Group by meta ID using Map for O(1) lookups
      const metaMap = new Map<
        number,
        {
          metaId: number;
          metaName: string;
          metaTag: string;
          totalCount: number;
          data: Array<{
            day: string;
            personalMapCount: number;
            regularMapCount: number;
          }>;
        }
      >();

      for (const row of results) {
        const metaId = Number(row.syncedMetaId);
        let meta = metaMap.get(metaId);

        if (!meta) {
          meta = {
            metaId: metaId,
            metaName: row.metaName,
            metaTag: row.metaTag,
            totalCount: 0,
            data: [],
          };
          metaMap.set(metaId, meta);
        }

        const dayTotal = row.personalMapCount + row.regularMapCount;
        meta.totalCount += dayTotal;

        meta.data.push({
          day: row.day,
          personalMapCount: row.personalMapCount,
          regularMapCount: row.regularMapCount,
        });
      }

      return Array.from(metaMap.values());
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      query: t.Object({
        days: t.Number({ minimum: 30, maximum: 365, default: 30 }),
      }),
      userId: true,
    },
  );
