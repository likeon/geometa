import { db } from '@api/lib/drizzle';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export const runMigrate = async (migrationsFolder = './migrations') => {
  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
};
