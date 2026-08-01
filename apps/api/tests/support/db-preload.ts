import { afterAll, beforeEach } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databasePrefix = 'geometa_test_';
const databaseName = `${databasePrefix}${randomUUID().replaceAll('-', '')}`;
const guardToken = randomUUID();
const adminUrl = new URL(
  process.env.TEST_DATABASE_ADMIN_URL ??
    'postgresql://postgres:postgres@localhost:5432/postgres',
);

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Database tests require NODE_ENV=test');
}
if (!['/postgres', '/template1'].includes(adminUrl.pathname)) {
  throw new Error(
    'TEST_DATABASE_ADMIN_URL must use the postgres or template1 maintenance database',
  );
}
if (!new RegExp(`^${databasePrefix}[a-f0-9]{32}$`).test(databaseName)) {
  throw new Error('Refusing unsafe test database name');
}

const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
process.env.DATABASE_URL = databaseUrl.toString();
process.env.DRIZZLE_LOGGER = 'false';

async function run(command: string, args: string[]) {
  const process = Bun.spawn([command, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = new Response(process.stdout).text();
  const stderr = new Response(process.stderr).text();
  const exitCode = await process.exited;
  const [stdoutText, stderrText] = await Promise.all([stdout, stderr]);
  if (exitCode !== 0) {
    throw new Error(
      `${command} exited with ${exitCode}\n${stdoutText}${stderrText}`,
    );
  }
}

async function dropDatabase() {
  await run('dropdb', [
    '--force',
    '--if-exists',
    `--maintenance-db=${adminUrl.toString()}`,
    databaseName,
  ]);
}

await run('createdb', [
  `--maintenance-db=${adminUrl.toString()}`,
  '--template=template0',
  databaseName,
]);

export const testSql = postgres(databaseUrl.toString(), { max: 1 });

async function verifyGuard() {
  const [identity] = await testSql<
    {
      database_name: string;
      token: string;
    }[]
  >`
    SELECT current_database() AS database_name, token
    FROM geometa_test.guard
  `;
  if (
    identity?.database_name !== databaseName ||
    identity.token !== guardToken
  ) {
    throw new Error(
      'Refusing destructive operation: test database guard mismatch',
    );
  }
}

async function truncatePublicTables() {
  await verifyGuard();
  await testSql.unsafe(`
    DO $$
    DECLARE table_names text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
      INTO table_names
      FROM pg_tables
      WHERE schemaname = 'public';

      IF table_names IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY';
      END IF;
    END $$;
  `);
}

try {
  const dumpPath = join(import.meta.dir, '../../utils/db/init.sql');
  const temporaryDumpPath = join(tmpdir(), `${databaseName}.sql`);
  const dump = await Bun.file(dumpPath).text();
  const sanitizedDump = dump.replace(
    /^ALTER .+ OWNER TO geometa;\r?$/gm,
    '-- Test bootstrap omits unavailable production owner.',
  );
  await Bun.write(temporaryDumpPath, sanitizedDump);

  try {
    await run('psql', [
      '-X',
      '--set=ON_ERROR_STOP=on',
      `--dbname=${databaseUrl.toString()}`,
      '--command=DROP SCHEMA public CASCADE',
      `--file=${temporaryDumpPath}`,
    ]);
  } finally {
    await rm(temporaryDumpPath, { force: true });
  }

  const baselineMigrationPath = join(
    import.meta.dir,
    '../../src/lib/db/migrations/0032_giant_salo.sql',
  );
  const baselineHash = createHash('sha256')
    .update(await Bun.file(baselineMigrationPath).text())
    .digest('hex');

  await testSql.unsafe(`
    CREATE SCHEMA drizzle;
    CREATE TABLE drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('${baselineHash}', 1754948970069);

    CREATE SCHEMA geometa_test;
    CREATE TABLE geometa_test.guard (token text PRIMARY KEY);
    INSERT INTO geometa_test.guard (token) VALUES ('${guardToken}');
  `);

  await migrate(drizzle(testSql), {
    migrationsFolder: join(import.meta.dir, '../../src/lib/db/migrations'),
  });
  await truncatePublicTables();
} catch (error) {
  await testSql.end({ timeout: 1 }).catch(() => undefined);
  await dropDatabase().catch(() => undefined);
  throw error;
}

beforeEach(truncatePublicTables);

afterAll(async () => {
  await verifyGuard();
  const { db } = await import('../../src/lib/drizzle');
  await Promise.all([
    db.$primary.$client.end({ timeout: 5 }),
    ...db.$replicas.map((replica) => replica.$client.end({ timeout: 5 })),
  ]);
  await testSql.end({ timeout: 5 });
  await dropDatabase();
});
