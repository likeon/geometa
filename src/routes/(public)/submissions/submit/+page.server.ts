import { createInsertSchema } from 'drizzle-zod';
import { metaSuggestions } from '$lib/db/schema';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { db } from '$lib/drizzle';
import { generateRandomString } from '$lib/utils';

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(insertMetaSuggestionsSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const insertData = { ...form.data, secret: generateRandomString(16), status: 'new' };
		const insertResult = await db
			.insert(metaSuggestions)
			.values(insertData)
			.returning({
				id: metaSuggestions.id,
				secret: metaSuggestions.secret
			})
			.run();

		const result = insertResult.rows[0];

		// Display a success status message
		return message(form, result);
	}
};

export const load = async () => {
	const form = await superValidate(zod(insertMetaSuggestionsSchema));
	return { form };
};

const insertMetaSuggestionsSchema = createInsertSchema(metaSuggestions, {
	url: (schema) => schema.url.url()
}).omit({ secret: true, id: true, status: true });
