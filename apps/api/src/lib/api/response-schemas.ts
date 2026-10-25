import { type TSchema, Type } from '@sinclair/typebox';
import { t } from 'elysia';
import { openApiReference } from './openapi-reference';

// ---------------------------------------------------------------------------
// Shared error payloads
//
// Routes document generic failures via OpenAPI $refs into these models,
// registered once on the root app (see src/api.ts). Auth failures are included
// by default because most routes are protected; public routes pass public: true.
// Existence and validation failures remain explicit per endpoint.
// ---------------------------------------------------------------------------

const messageSchema = (name: string) =>
  t.Object({ message: t.String() }, { $id: `#/components/schemas/${name}` });

const validationErrorSchema = t.Object(
  {
    type: t.Literal('validation'),
    on: t.String(),
    property: t.Optional(t.String()),
    message: t.Optional(t.String()),
    summary: t.Optional(t.String()),
    found: t.Optional(t.Unknown()),
    expected: t.Optional(t.Unknown()),
    errors: t.Optional(
      t.Array(
        t.Object({
          type: t.Optional(Type.Integer()),
          schema: t.Optional(t.Unknown()),
          path: t.String(),
          value: t.Optional(t.Unknown()),
          message: t.String(),
          summary: t.Optional(t.String()),
        }),
      ),
    ),
  },
  { $id: '#/components/schemas/ValidationError' },
);

// body constants used by handlers and hooks when they answer with a generic
// error; the response schemas only care about the shape, not the exact text
export const unauthorizedResponse = { message: 'Unauthorized' };
export const forbiddenResponse = { message: 'Forbidden' };
export const notFoundResponse = { message: 'Not found' };
export const internalErrorResponse = { message: 'Internal Server Error' };

// Models registered once on the root app; response schemas reference them by
// $ref for the OpenAPI document. Fresh reference objects are created per
// route because the Elysia schema registry collides when one shared schema
// object is reused across routes.
export const commonModels = {
  ValidationError: validationErrorSchema,
  UnauthorizedError: messageSchema('UnauthorizedError'),
  ForbiddenError: messageSchema('ForbiddenError'),
  NotFoundError: messageSchema('NotFoundError'),
  InternalError: messageSchema('InternalError'),
};

const unauthorizedErrorRef = () =>
  openApiReference('UnauthorizedError', commonModels.UnauthorizedError);
const forbiddenErrorRef = () =>
  openApiReference('ForbiddenError', commonModels.ForbiddenError);
const notFoundErrorRef = () =>
  openApiReference('NotFoundError', commonModels.NotFoundError);
const internalErrorRef = () =>
  openApiReference('InternalError', commonModels.InternalError);
const validationErrorRef = () =>
  openApiReference('ValidationError', commonModels.ValidationError);

export type BuildResponseOptions = {
  /** Public route. Auth failures are omitted unless explicitly enabled. */
  public?: boolean;
  /** Route can reject the caller as unauthenticated (401). */
  unauthorized?: boolean;
  /** Route handlers or authorization hooks can answer 403. */
  forbidden?: boolean;
  /** Route has an existence check that answers 404. */
  notFound?: boolean;
  /** Route declares input schemas (body/query/params/headers). */
  validation?: boolean;
};

type UnauthorizedRef = ReturnType<typeof unauthorizedErrorRef>;
type ForbiddenRef = ReturnType<typeof forbiddenErrorRef>;
type NotFoundRef = ReturnType<typeof notFoundErrorRef>;
type InternalRef = ReturnType<typeof internalErrorRef>;
type ValidationRef = ReturnType<typeof validationErrorRef>;

type CommonStatuses<O extends BuildResponseOptions> = {
  500: InternalRef;
} & (O extends { public: true }
  ? O extends { unauthorized: true }
    ? { 401: UnauthorizedRef }
    : Record<never, never>
  : { 401: UnauthorizedRef }) &
  (O extends { public: true }
    ? O extends { forbidden: true }
      ? { 403: ForbiddenRef }
      : Record<never, never>
    : { 403: ForbiddenRef }) &
  (O extends { notFound: true } ? { 404: NotFoundRef } : Record<never, never>) &
  (O extends { validation: true }
    ? { 422: ValidationRef }
    : Record<never, never>);

/**
 * Composes a route's explicit status schemas with the shared error models.
 * The return type preserves the literal status keys and payload statics of
 * every provided schema plus the enabled common statuses, so Eden/route
 * response typing stays precise.
 */
export function buildResponses<
  S extends Record<number, TSchema>,
  O extends BuildResponseOptions = Record<never, never>,
>(statusSchemas: S, options: O = {} as O): S & CommonStatuses<O> {
  const merged = {
    ...statusSchemas,
    500: internalErrorRef(),
    ...(options.public !== true || options.unauthorized === true
      ? { 401: unauthorizedErrorRef() }
      : {}),
    ...(options.public !== true || options.forbidden === true
      ? { 403: forbiddenErrorRef() }
      : {}),
    ...(options.notFound ? { 404: notFoundErrorRef() } : {}),
    ...(options.validation ? { 422: validationErrorRef() } : {}),
  } as S & {
    500: InternalRef;
    401?: UnauthorizedRef;
    403?: ForbiddenRef;
    404?: NotFoundRef;
    422?: ValidationRef;
  };
  return merged as S & CommonStatuses<O>;
}
