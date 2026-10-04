import { buildResponses } from '@api/lib/api/response-schemas';
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
      const conditions = [
        eq(maps.isPersonal, false),
        eq(maps.isPublished, true),
      ];

      if (geoguessrId) conditions.push(eq(maps.geoguessrId, geoguessrId));

      if (q) {
        const searchCondition = or(
          ilike(maps.name, `%${q}%`),
          ilike(maps.description, `%${q}%`),
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      if (region) {
        conditions.push(sql`exists(
          SELECT 1
          FROM map_regions mr
          JOIN regions r ON r.id = mr.region_id
          WHERE mr.map_id = "maps"."id"
          AND r.name = ${region}
        )`);
      }

      if (isShared !== undefined) conditions.push(eq(maps.isShared, isShared));

      const result = await db.query.maps.findMany({
        where: and(...conditions),
        orderBy: (maps, { desc }) => [
          desc(maps.isVerified),
          desc(maps.ordering),
          desc(maps.numberOfGamesPlayedDiminished),
        ],
        with: {
          mapRegions: {
            with: { region: { columns: { name: true } } },
          },
        },
      });

      return result.map((map) => ({
        ...pick(map, [
          'geoguessrId',
          'name',
          'description',
          'authors',
          'isShared',
        ]),
        regions: map.mapRegions.map((mr) => mr.region.name),
      }));
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
      response: buildResponses(
        {
          200: t.Array(
            t.Object({
              geoguessrId: t.String(),
              name: t.String(),
              description: t.Union([t.String(), t.Null()]),
              authors: t.Union([t.String(), t.Null()]),
              isShared: t.Boolean(),
              regions: t.Array(t.String()),
            }),
          ),
        },
        { public: true, validation: true },
      ),
      detail: {
        tags: ['Maps'],
        operationId: 'listMaps',
        summary: 'List maps',
        description:
          'Returns published, non-personal Learnable Meta maps. Results are ordered by verification, editorial ordering, and popularity.',
      },
    },
  );
