import { db } from '@lib/drizzle';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

export const runMigrate = async () => {
  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
};
