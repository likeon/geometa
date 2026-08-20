import { maps } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { pick } from 'remeda';

const publicMap = t.Object({
  geoguessrId: t.String({ description: 'GeoGuessr map ID.' }),
  name: t.String({ description: 'Display name.' }),
  description: t.Nullable(t.String({ description: 'Map description.' })),
  authors: t.Nullable(t.String({ description: 'Map author attribution.' })),
  isShared: t.Boolean({
    description: 'Whether the map shares metas from another map.',
  }),
  regions: t.Array(t.String(), {
    description: 'Region names assigned to the map.',
  }),
});

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
        q: t.Optional(
          t.String({ description: 'Search map names and descriptions.' }),
        ),
        geoguessrId: t.Optional(
          t.String({ description: 'Return only this GeoGuessr map ID.' }),
        ),
        region: t.Optional(
          t.String({ description: 'Return maps assigned to this region.' }),
        ),
        isShared: t.Optional(
          t.Boolean({
            description: 'Filter by whether maps share metas from another map.',
          }),
        ),
      }),
      response: {
        200: t.Array(publicMap, {
          description: 'Published maps matching the supplied filters.',
        }),
        422: t.Unknown({ description: 'The query parameters are invalid.' }),
      },
      detail: {
        tags: ['Maps'],
        operationId: 'listMaps',
        summary: 'List published maps',
        description:
          'Returns published, non-personal LearnableMeta maps. Results are ordered by verification, editorial ordering, and popularity.',
      },
    },
  );
