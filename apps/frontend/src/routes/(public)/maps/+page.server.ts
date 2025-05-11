import { getData } from '$lib/server/mapsCache';

export const load = async () => {
  return await getData();
};
