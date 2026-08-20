import { describe, expect, test } from 'bun:test';
import { app } from './api';

const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
const expectedOperations = [
  'exportMapLocations',
  'getLocationMeta',
  'getMapCompatibility',
  'getUserscriptAnnouncement',
  'listAccessibleMapGroups',
  'listMapGroupMaps',
  'listMaps',
];
const protectedOperations = new Set([
  'exportMapLocations',
  'listAccessibleMapGroups',
  'listMapGroupMaps',
]);

type Operation = {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  responses?: Record<string, { description?: string }>;
  security?: Record<string, string[]>[];
};

type OpenApiDocument = {
  paths: Record<string, Partial<Record<(typeof methods)[number], Operation>>>;
  components?: { securitySchemes?: Record<string, unknown> };
};

describe('public OpenAPI contract', () => {
  test('does not expose the legacy documentation frontend', async () => {
    for (const path of ['/api/docs', '/api/docs/']) {
      const response = await app.handle(new Request(`http://localhost${path}`));
      expect(response.status, path).toBe(404);
    }
  });

  test('documents every public operation', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/docs/json'),
    );
    const document = (await response.json()) as OpenApiDocument;
    const operations = Object.entries(document.paths)
      .filter(
        ([path]) => path.startsWith('/api/userscript') || path === '/api/maps/',
      )
      .flatMap(([path, item]) =>
        methods.flatMap((method) => {
          const operation = item[method];
          return operation ? [{ method, path, operation }] : [];
        }),
      );

    expect(
      operations.map(({ operation }) => operation.operationId).sort(),
    ).toEqual(expectedOperations);
    expect(
      document.components?.securitySchemes?.learnableMetaToken,
    ).toBeTruthy();

    for (const { method, path, operation } of operations) {
      const label = `${method.toUpperCase()} ${path}`;
      expect(operation.tags?.length, `${label} tags`).toBeGreaterThan(0);
      expect(
        operation.summary?.trim().length,
        `${label} summary`,
      ).toBeGreaterThan(0);
      expect(
        operation.description?.trim().length,
        `${label} description`,
      ).toBeGreaterThan(0);
      expect(
        operation.responses?.['200'],
        `${label} 200 response`,
      ).toBeTruthy();
      for (const [status, schema] of Object.entries(
        operation.responses ?? {},
      )) {
        expect(
          schema.description?.trim().length,
          `${label} ${status} description`,
        ).toBeGreaterThan(0);
      }
      if (protectedOperations.has(operation.operationId ?? '')) {
        expect(operation.security, `${label} security`).toEqual([
          { learnableMetaToken: [] },
        ]);
      }
    }
  });
});
