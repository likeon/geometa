import { getData } from '$lib/server/mapsCache';
import { MAPS_VIEW_MODE_COOKIE, parseViewMode } from '$lib/view-mode';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const mapsViewMode = parseViewMode(cookies.get(MAPS_VIEW_MODE_COOKIE), 'cards');

  const dataPromise = getData();
  return {
    mapsViewMode,
    regionList: dataPromise.then((data) => data.regionsList),
    allMaps: dataPromise.then((data) => data.allMaps)
  };
};
