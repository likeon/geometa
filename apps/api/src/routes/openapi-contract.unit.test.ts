import { describe, expect, test } from 'bun:test';
import { app } from '../api';

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  not?: JsonSchema;
  $ref?: string;
  format?: string;
  default?: unknown;
  [key: string]: unknown;
};

type Operation = {
  parameters?: Array<{
    in?: string;
    name?: string;
  }>;
  requestBody?: unknown;
  responses?: Record<
    string,
    { content?: Record<string, { schema?: JsonSchema }> }
  >;
  security?: unknown;
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

async function loadOpenApiDocument() {
  const response = await app.handle(
    new Request('http://localhost/api/docs/json'),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as {
    paths: Record<
      string,
      Partial<Record<(typeof HTTP_METHODS)[number], Operation>>
    >;
    components?: { schemas?: Record<string, JsonSchema> };
  };
}

function* walkSchemas(schema: JsonSchema): Generator<JsonSchema> {
  yield schema;
  for (const key of ['properties', 'patternProperties']) {
    const properties = schema[key] as Record<string, JsonSchema> | undefined;
    if (properties) {
      for (const property of Object.values(properties))
        yield* walkSchemas(property);
    }
  }
  for (const key of ['items', 'contains', 'not']) {
    const child = schema[key] as JsonSchema | undefined;
    if (child) yield* walkSchemas(child);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf', 'prefixItems']) {
    const children = schema[key] as JsonSchema[] | undefined;
    if (children) {
      for (const child of children) yield* walkSchemas(child);
    }
  }
}

function collectRefs(value: unknown, refs: Set<string>) {
  if (!value || typeof value !== 'object') return;
  if ('$ref' in value && typeof value.$ref === 'string') refs.add(value.$ref);
  for (const child of Object.values(value)) collectRefs(child, refs);
}

function operations(doc: Awaited<ReturnType<typeof loadOpenApiDocument>>) {
  return Object.entries(doc.paths).flatMap(([path, definitions]) =>
    HTTP_METHODS.flatMap((method) => {
      const operation = definitions[method];
      return operation ? [{ path, method, operation }] : [];
    }),
  );
}

describe('OpenAPI schema contract', () => {
  let doc: Awaited<ReturnType<typeof loadOpenApiDocument>>;

  test('documents every application endpoint', async () => {
    doc = await loadOpenApiDocument();
    const appOperations = operations(doc);
    expect(appOperations).toHaveLength(63);
    expect(appOperations.some(({ path }) => path === '/api/health-check')).toBe(
      true,
    );
  });

  test('every endpoint has output and applicable input schemas', async () => {
    for (const { path, method, operation } of operations(doc)) {
      const label = `${method.toUpperCase()} ${path}`;
      const responses = operation.responses ?? {};
      expect(responses['200'], `${label} 200 response`).toBeDefined();
      expect(responses['500'], `${label} 500 response`).toBeDefined();

      const hasRequestInput = Boolean(
        operation.requestBody ||
          operation.parameters?.some((parameter) => parameter.in !== 'header'),
      );
      if (hasRequestInput) {
        expect(responses['422'], `${label} validation response`).toBeDefined();
      }

      const protectedUserscriptRoute =
        path === '/api/userscript/map-groups' ||
        path === '/api/userscript/map-group/{groupId}/maps' ||
        path === '/api/userscript/map/{geoguessrId}/locations';
      const protectedRoute =
        path.startsWith('/api/internal/') || protectedUserscriptRoute;
      const headers = new Set(
        (operation.parameters ?? [])
          .filter((parameter) => parameter.in === 'header')
          .map((parameter) => parameter.name),
      );
      if (protectedRoute) {
        expect(
          headers.has('authorization'),
          `${label} authorization header`,
        ).toBe(true);
        if (path.startsWith('/api/internal/')) {
          expect(headers.has('x-api-user-id'), `${label} user id header`).toBe(
            true,
          );
        }
        expect(responses['401'], `${label} 401 response`).toBeDefined();
        expect(responses['403'], `${label} 403 response`).toBeDefined();
        expect(operation.security, `${label} security`).toEqual([
          {
            [protectedUserscriptRoute ? 'learnableMetaToken' : 'bearerAuth']:
              [],
          },
        ]);
      } else {
        expect(headers.size, `${label} public headers`).toBe(0);
      }
    }
  });

  test('shared refs resolve and obsolete auth models are absent', async () => {
    const components = doc.components?.schemas ?? {};
    for (const model of [
      'ValidationError',
      'UnauthorizedError',
      'ForbiddenError',
      'NotFoundError',
      'InternalError',
    ]) {
      expect(components[model], `${model} model`).toBeDefined();
    }
    expect(components.UnauthenticatedResponse).toBeUndefined();
    expect(components.InvalidAuthTokenResponse).toBeUndefined();

    const refs = new Set<string>();
    collectRefs(doc, refs);
    for (const ref of refs) {
      const name = ref.split('/').at(-1);
      expect(components[name!], `$ref "${ref}" resolves`).toBeDefined();
    }
  });

  test('output integers are strict TypeBox integers', async () => {
    const components = doc.components?.schemas ?? {};
    for (const { path, method, operation } of operations(doc)) {
      for (const [status, response] of Object.entries(
        operation.responses ?? {},
      )) {
        const schema = response.content?.['application/json']?.schema;
        if (!schema) continue;
        for (const node of walkSchemas(schema)) {
          const hasInteger = node.anyOf?.some(
            (variant) => variant.type === 'integer',
          );
          const hasOpenApiIntegerString = node.anyOf?.some(
            (variant) =>
              variant.type === 'string' &&
              (variant.format !== undefined || variant.default !== undefined),
          );
          expect(
            Boolean(hasInteger && hasOpenApiIntegerString),
            `${method.toUpperCase()} ${path} ${status}: integer|string output`,
          ).toBe(false);
        }
      }
    }

    for (const schema of Object.values(components)) {
      for (const node of walkSchemas(schema)) {
        expect(
          Boolean(node.type === 'integer' && node.format === 'int32'),
        ).toBe(false);
      }
    }
  });
});
