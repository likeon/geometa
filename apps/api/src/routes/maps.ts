import { maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { pick } from 'remeda';

export const mapsRouter = new Elysia({ prefix: '/maps' })
  // List public maps with filters
  .get(
    '/',
    async ({ query }) => {
      const { q, geoguessrId, region, isShared } = query;

      // Build filter conditions
      const conditions = [
        eq(maps.isPersonal, false), // Only non-personal maps
        eq(maps.isPublished, true), // Only published maps
      ];

      // Find by geoguessrId
      if (geoguessrId) {
        conditions.push(eq(maps.geoguessrId, geoguessrId));
      }

      // Search filter (name or description)
      if (q) {
        const searchCondition = or(
          ilike(maps.name, `%${q}%`),
          ilike(maps.description, `%${q}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      // region
      if (region) {
        const regionCondition = sql`exists(
          SELECT 1
          FROM map_regions mr
          JOIN regions r ON r.id = mr.region_id
          WHERE mr.map_id = "maps"."id"
          AND r.name = ${region}
        )`;
        conditions.push(regionCondition);
      }

      // Shared filter
      if (isShared !== undefined) {
        conditions.push(eq(maps.isShared, isShared));
      }

      // Query maps with regions
      const result = await db.query.maps.findMany({
        where: and(...conditions),
        orderBy: (maps, { desc }) => [
          desc(maps.isVerified),
          desc(maps.ordering),
          desc(maps.numberOfGamesPlayedDiminished),
        ],
        with: {
          mapRegions: {
            with: {
              region: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Transform results to include regions and pick relevant fields
      const transformedMaps = result.map((map) => ({
        ...pick(map, [
          'geoguessrId',
          'name',
          'description',
          'authors',
          'isShared',
        ]),
        regions: map.mapRegions.map((mr) => mr.region.name),
      }));

      return transformedMaps;
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        geoguessrId: t.Optional(t.String()),
        region: t.Optional(t.String()),
        isShared: t.Optional(t.Boolean()),
      }),
    },
  );
