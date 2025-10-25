import { type SQL, sql } from 'drizzle-orm';

/**
 * Creates a raw SQL array.
 * Prevents Drizzle's default array behavior.
 * Input is still sanitized.
 *
 * Source: https://www.answeroverflow.com/m/1155016104721272925
 */
export function createRawSqlArray(itemList: string[]) {
  const sanitizedItems: SQL<unknown>[] = [sql`'{`];
  const rawItems: SQL<unknown>[] = [];

  for (const item of itemList) {
    rawItems.push(sql.raw(sql`${item}`.queryChunks[1]!.toString()));
  }

  sanitizedItems.push(sql.join(rawItems, sql`, `));
  sanitizedItems.push(sql`}'::text[]`);

  return sql.join(sanitizedItems);
}
