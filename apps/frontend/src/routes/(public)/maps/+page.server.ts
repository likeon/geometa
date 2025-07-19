import { getData } from '$lib/server/mapsCache';

export const load = async () => {
  const dataPromise = getData();
  return {
    regionList: dataPromise.then((data) => data.regionsList),
    allMaps: dataPromise.then((data) => data.allMaps)
  };
};
