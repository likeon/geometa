import { error } from '@sveltejs/kit';

export function getGroupId(params: { id: string }) {
	const id = parseInt(params.id, 10);

	if (isNaN(id)) {
		error(400, 'Invalid ID');
	}

	return id;
}
