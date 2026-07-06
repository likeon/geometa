import { getData } from '$lib/server/mapsCache';
import type { PageServerLoad } from './$types';

type MapsViewMode = 'cards' | 'list';

const MAPS_VIEW_MODE_COOKIE = 'maps-view-mode';
const DEFAULT_MAPS_VIEW_MODE: MapsViewMode = 'cards';

function getMapsViewMode(value: string | undefined): MapsViewMode {
  return value === 'cards' || value === 'list' ? value : DEFAULT_MAPS_VIEW_MODE;
}

export const load: PageServerLoad = async ({ cookies }) => {
  const mapsViewMode = getMapsViewMode(cookies.get(MAPS_VIEW_MODE_COOKIE));

  const dataPromise = getData();
  return {
    mapsViewMode,
    regionList: dataPromise.then((data) => data.regionsList),
    allMaps: dataPromise.then((data) => data.allMaps)
  };
};
