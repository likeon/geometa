import { redirect } from '@sveltejs/kit';

export const load = () =>
  redirect(308, 'https://docs.learnablemeta.com/getting-started/personal-maps/');
