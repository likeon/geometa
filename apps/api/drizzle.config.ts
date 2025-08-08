import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost/geometa';

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
