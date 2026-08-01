# Testing

## Setup

Run all tests: `bun run test`

Run DB-free tests: `bun run test:unit`

Run PostgreSQL tests: `bun run test:db`

Run one DB-free file:
`bun run test:unit src/lib/utils/common.unit.test.ts`

Run one PostgreSQL file: `bun run test:db src/routes/maps.db.test.ts`

Bun forwards arguments after the script name. Use the matching suite command so
DB files receive the preload and serial-execution settings from `package.json`.

PostgreSQL tests require a running PostgreSQL server and the `createdb`, `psql`,
and `dropdb` commands. Set `TEST_DATABASE_ADMIN_URL` when the server is not
available at the default URL:

```sh
TEST_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres \
  bun run test:db
```

`TEST_DATABASE_ADMIN_URL` must point to the `postgres` or `template1`
maintenance database. Never point it to the development application database.

The preload in `tests/support/db-preload.ts` sets `DATABASE_URL` before test
modules import application code. This ordering matters because
`src/lib/drizzle.ts` creates its clients and reads `DATABASE_URL` at import time.

## Database harness

Each DB suite run:

1. Creates a random `geometa_test_*` database from `template0`.
2. Loads `utils/db/init.sql` into that database.
3. Records the dump's verified migration baseline and applies newer Drizzle
   migrations.
4. Creates a run-specific guard outside the public schema.
5. Truncates every public table with `RESTART IDENTITY` before each test.
6. Closes application and harness connection pools after the suite.
7. Verifies database identity and drops only the temporary database.

The harness never derives its target from the application's inherited
`DATABASE_URL`. Guard token and generated database name are checked before every
truncate and normal teardown. DB tests run serially against one shared temporary
database.

Use `testSql` from `tests/support/db-preload.ts` only when raw SQL is necessary.
Prefer the production Drizzle schema and `db` instance for setup because this
keeps test data aligned with application types.

## Test layout

Test files live beside the TypeScript files they exercise, similar to Rust unit
test modules:

```text
src/lib/utils/common.ts
src/lib/utils/common.unit.test.ts

src/routes/maps.ts
src/routes/maps.db.test.ts
```

Use these suffixes:

- `.unit.test.ts` for DB-free tests. These run concurrently.
- `.db.test.ts` for tests requiring PostgreSQL. These run serially with the DB
  preload.

Keep shared harness code under `tests/support/`; do not place test cases there.

## Testing philosophy

### Two layers, two responsibilities

**Shared/domain layer** (`src/lib/**`): owns shared behavior. Test utilities,
authentication parsing, permission rules, data transformations, synchronization
logic, and reusable error handling directly. Use `.unit.test.ts` when behavior
does not require PostgreSQL and `.db.test.ts` when SQL semantics are part of the
behavior.

Important shared-layer cases include null and falsy values, wrapped PostgreSQL
errors, permission boundaries, serialization, conflict handling, and branch-heavy
transformations. A bug in shared logic gets one regression test beside that
shared module.

**Route layer** (`src/routes/**`): trusts covered shared helpers and focuses on
what is unique to the endpoint. Exercise Elysia through
`app.handle(new Request(fullUrl))`; do not start a listening server. DB-backed
routes use the real temporary PostgreSQL database and production Drizzle schema.

Why split: if generic auth parsing, PostgreSQL error detection, or shared
transformation behavior changes, one shared test suite should identify the root
cause. Route suites should fail only when endpoint wiring, contract, access
rules, or endpoint-specific business behavior breaks.

### What route tests must check

1. **Smoke path**: valid request returns expected status and response shape.
2. **Endpoint-specific business rules**: publication visibility, ownership,
   permissions, filtering, ordering, pagination, or mutation rules implemented by
   that route.
3. **Request transformation**: optional query/body values reach domain logic
   correctly; explicit falsy values such as `false` and `0` survive.
4. **Response transformation**: selected fields, nested relations, derived
   values, and omitted private fields match the public contract.
5. **Endpoint-specific errors**: validation, not-found, conflict, and permission
   responses unique to the route.
6. **Realistic edge cases**: empty results, combined filters, missing optional
   values, boundary values, and partial updates.
7. **Isolation**: tests seed only data they need and pass independently. Do not
   depend on IDs or bootstrap rows. Only a harness regression test may
   intentionally prove cleanup across consecutive tests.

Mine route schemas, comments, and frontend usage for realistic scenarios. A
happy-path test is the floor, not the whole route suite.

### What route tests must not do

- Do not assert exact generated SQL. Test observable data behavior.
- Do not mock Drizzle for a DB-backed route. Real PostgreSQL catches schema,
  relation, constraint, transaction, and query issues that mocks hide.
- Do not re-test generic bearer-token parsing in every protected route. Test
  parsing beside auth code; test only route-specific access rules in route files.
- Do not re-test generic PostgreSQL error recognition in every mutation route.
- Do not test temporary database creation, migration, or truncation mechanics in
  each endpoint suite.
- Do not rely on test order or manually clean public tables. Preload owns cleanup.

### Mocking boundary

Use real Elysia routing, application code, Drizzle, and PostgreSQL for DB-backed
endpoint tests. Mock at external system boundaries: HTTP calls, S3, Google APIs,
Discord, GeoGuessr, or similar services. Prefer mocking a narrow client module or
fetch boundary rather than internal business functions.

DB-free unit tests may replace narrow collaborators when needed, but should test
the module's public behavior rather than implementation call counts unless the
interaction itself is the contract.

## Adding a new endpoint

1. Add a colocated `.db.test.ts` for DB-backed behavior or `.unit.test.ts` for a
   pure module.
2. Write one smoke test using `app.handle()`.
3. List every branch and transformation unique to the endpoint. Add one focused
   test per meaningful behavior.
4. Add realistic edge cases from route schema, comments, and caller usage.
5. Seed the smallest complete dataset inside each test or a local setup helper.
6. Put regressions beside the layer that caused the bug. Shared bug means shared
   test; route bug means route test.
7. Run the single file, then `bun run test`, then `bun run sanity`.
