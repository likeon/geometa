import { Kind, type Static, type TSchema, Type } from '@sinclair/typebox';
import { TypeSystem } from '@sinclair/typebox/system';
import { Value } from '@sinclair/typebox/value';

// Reference schemas keep two sides:
// - `$ref` points at the component schema registered in the OpenAPI document,
//   so generated docs reuse one definition instead of duplicating it.
// - the custom kind makes TypeBox validate through the real target schema at
//   runtime, because `$ref` alone is unresolvable to TypeBox.
const referenceTarget = Symbol.for('api.openapi-reference.target');
const REFERENCE_KIND = 'OpenApiReference';

type ReferenceSchema = TSchema & { [referenceTarget]?: TSchema };

export type OpenApiReference<T extends TSchema> = TSchema & {
  static: Static<T>;
  $ref: string;
};

function checkResolvedReference(schema: ReferenceSchema, value: unknown) {
  const target = schema[referenceTarget];
  return target !== undefined ? Value.Check(target, value) : false;
}

let referenceKindRegistered = false;

export function openApiReference<T extends TSchema>(
  schemaName: string,
  schema: T,
): OpenApiReference<T> {
  if (!referenceKindRegistered) {
    try {
      TypeSystem.Type(REFERENCE_KIND, checkResolvedReference);
    } catch {
      // another module instance already registered the kind
    }
    referenceKindRegistered = true;
  }

  const $ref = schemaName.startsWith('#/')
    ? schemaName
    : `#/components/schemas/${schemaName}`;

  return Type.Unsafe<Static<T>>({
    [Kind]: REFERENCE_KIND,
    $ref,
    [referenceTarget]: schema,
  }) as OpenApiReference<T>;
}
