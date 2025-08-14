import type { Config } from 'drizzle-kit';

const postgresPort = process.env.TILT_PORT_POSTGRES || '5432';
const databaseUrl = `postgresql://postgres:postgres@localhost:${postgresPort}/geometa`;

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
