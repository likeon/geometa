import { db } from '$lib/drizzle';
import type { PageServerLoad } from './$types';
import { sql } from 'drizzle-orm'

type EntryQueryResult = {
	id: number,
	type: string,
	description: string
	tagsJSON: string
}[]
const entriesSql = sql`
SELECT
  e.id,
  e.type,
  e.description,
  (
    SELECT
      JSON_GROUP_ARRAY(JSON_OBJECT('id', et.id, 'tagName', t.name, 'tagId', t.id))
    FROM
      meta_entries_tags et
      JOIN meta_tags t ON t.id = et.tag_id
    WHERE
      et.entry_id = e.id
  ) AS tagsJSON
FROM
  meta_entries e
`

export const load: PageServerLoad = async () => {
	return { entries: await db.all(entriesSql) as EntryQueryResult, q: 1 };
};
