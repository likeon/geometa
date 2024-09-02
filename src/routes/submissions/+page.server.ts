import { db } from '$lib/drizzle';
import { metaSuggestions } from '$db/schema';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

export const load = async () => {
	const result = await db
		.select({
			authorNickname: metaSuggestions.author_nickname,
			submissionsCount: sql`count
          (${metaSuggestions.id})`
		})
		.from(metaSuggestions)
		.where(and(eq(metaSuggestions.status, 'accepted'), isNotNull(metaSuggestions.author_nickname)))
		.groupBy(metaSuggestions.author_nickname)
		.orderBy(
			desc(sql`count
              (${metaSuggestions.id})`)
		);

	return { aggregatedSubmissions: result };
};
