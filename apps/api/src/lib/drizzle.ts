import { config, getDatabaseConfig } from '@api/config';
import { withReplicas } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

const poolSize = 10;

function createDbInstance() {
  // Without a distinct replica, use leader as replica to preserve one DB type.
  const { leaderUrl, replicaUrl } = getDatabaseConfig();
  const leader = drizzle(postgres(leaderUrl, { max: poolSize }), {
    schema,
    logger: config.DRIZZLE_LOGGER,
  });
  const replica = drizzle(postgres(replicaUrl, { max: poolSize }), {
    schema,
    logger: config.DRIZZLE_LOGGER,
  });
  return withReplicas(leader, [replica]);
}
export const db = createDbInstance();
