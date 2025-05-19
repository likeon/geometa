import { type SQLWrapper, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './db/schema';

function createDbInstance() {
  let databaseURL: string;
  if (process.env.DATABASE_URL) {
    databaseURL = process.env.DATABASE_URL;
  } else {
    databaseURL = `postgresql://geometa:${process.env.DATABASE_PASSWORD}@postgres/geometa?sslmode=require`;
  }
  return drizzle(databaseURL, {
    schema,
    logger: process.env.DRIZZLE_LOGGER === 'true',
  });
}
export const db = createDbInstance();

export const explainAnalyze = async <T extends SQLWrapper>(query: T) => {
  const debugResult = await db.execute(sql`EXPLAIN ANALYZE ${query.getSQL()}`);
  console.debug(debugResult);
};
