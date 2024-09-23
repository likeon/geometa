import { db } from '$lib/drizzle';
import { metaSuggestions } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const id = parseInt(params.id, 10);

	if (isNaN(id)) {
		error(400, 'Invalid ID');
	}

	const result = await db
		.select()
		.from(metaSuggestions)
		.where(and(eq(metaSuggestions.id, id), eq(metaSuggestions.secret, params.secret)));

	if (!result.length) {
		error(404, 'Submission not found');
	}
	return {'submission': result[0]};
};
