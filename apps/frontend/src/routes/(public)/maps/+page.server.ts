import { getData } from '$lib/server/mapsCache';
import { mockMaps, mockRegions } from '$lib/mocks/maps';

export const load = async () => {
  if (import.meta.env.VITE_ENV === 'development') {
    return {
      regionList: Promise.resolve(mockRegions),
      allMaps: Promise.resolve(mockMaps)
    };
  }
  const dataPromise = getData();
  return {
    regionList: dataPromise.then((data) => data.regionsList),
    allMaps: dataPromise.then((data) => data.allMaps)
  };
};
