import { SQL } from 'bun';
import { type SQLWrapper, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import { withReplicas } from 'drizzle-orm/pg-core';
import * as schema from './db/schema';

function createDbInstance() {
  // without replica db has different type
  // so have to specify main db as replica for local development
  let databaseURL: string;
  let replicaURL: string;
  if (process.env.DATABASE_URL) {
    databaseURL = process.env.DATABASE_URL;
    replicaURL = databaseURL;
  } else if (process.env.DATABASE_PASSWORD) {
    databaseURL = `postgresql://geometa:${process.env.DATABASE_PASSWORD}@postgres/geometa?sslmode=require`;
    replicaURL = `postgresql://geometa:${process.env.DATABASE_PASSWORD}@postgres-repl/geometa?sslmode=require`;
  } else {
    databaseURL = 'postgresql://postgres:postgres@localhost/geometa';
    replicaURL = databaseURL;
  }
  const leader = drizzle(new SQL(databaseURL, { max: 5 }), {
    schema,
    logger: process.env.DRIZZLE_LOGGER === 'true',
  });
  const replica = drizzle(new SQL(replicaURL, { max: 5 }), {
    schema,
    logger: process.env.DRIZZLE_LOGGER === 'true',
  });
  return withReplicas(leader, [replica]);
}
export const db = createDbInstance();

export const explainAnalyze = async <T extends SQLWrapper>(query: T) => {
  const debugResult = await db.execute(sql`EXPLAIN ANALYZE ${query.getSQL()}`);
  console.debug(debugResult);
};
