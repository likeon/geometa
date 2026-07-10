export async function geoguessrAPIFetch(
  url: string,
  { method = 'GET', headers, ...restOptions }: RequestInit = {},
) {
  const ncfaToken = process.env.NFCA_TOKEN || null;

  if (ncfaToken == null) {
    throw new Error('NFCA_TOKEN IS MISSING');
  }

  const defaultHeaders = {
    Cookie: `_ncfa=${ncfaToken}`,
    'Content-Type': 'application/json',
  };

  const mergedHeaders = {
    ...defaultHeaders,
    ...(headers || {}),
  };

  return await fetch(url, {
    method,
    headers: mergedHeaders,
    ...restOptions,
  });
}

type GeoguessrMapInfo = {
  id: string;
  numberOfGamesPlayed: number;
};

export async function geoguessrGetMapInfo(geoguessrId: string) {
  const url = `https://www.geoguessr.com/api/v3/search/map?page=0&count=1&q=${geoguessrId}`;

  const response = await geoguessrAPIFetch(url);
  if (!response.ok) throw new Error('Failed to fetch map info');
  const data = (await response.json()) as GeoguessrMapInfo[];

  if (!data.length) {
    return null;
  }

  const mapInfo = data[0];
  if (mapInfo.id !== geoguessrId) {
    // found map id doesn't match the requested id
    // probably in cases where not an actual map id was provided
    // treat it the same as map not found
    return null;
  }

  return mapInfo;
}

export const popularMapMessage =
  'This is a popular map which requires additional verification - ask for it in #map-making Discord channel';

// Maps with a large playerbase need manual verification before non-superadmins
// can claim their geoguessrId.
export async function isPopularMap(geoguessrId: string): Promise<boolean> {
  const mapInfo = await geoguessrGetMapInfo(geoguessrId);
  return mapInfo !== null && mapInfo.numberOfGamesPlayed > 10000;
}

// GeoGuessr "map JSON" download payload, shared by the location-export
// endpoints. Locations without an extraTag get an empty tag list.
export function geoguessrMapJson(
  name: string,
  locations: {
    lat: number;
    lng: number;
    heading: number;
    pitch: number;
    zoom: number;
    panoId: string | null;
    extraPanoId: string | null;
    extraPanoDate: string | null;
    extraTag?: string;
  }[],
) {
  return {
    name,
    customCoordinates: locations.map((location) => ({
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      pitch: location.pitch,
      zoom: location.zoom,
      panoId: location.panoId,
      countryCode: null,
      stateCode: null,
      extra: {
        tags: location.extraTag === undefined ? [] : [location.extraTag],
        panoDate: location.extraPanoDate,
        panoId: location.extraPanoId,
      },
    })),
    extra: {
      tags: {},
      infoCoordinates: [],
    },
  };
}

//for metas that are taken not from syncedMeta images have no compression, we can remove it later when most map will be on new system
// todo: remove
export function maybeWrapImageUrl(url: string): string {
  const cdnPrefix =
    'https://learnablemeta.com/cdn-cgi/image/format=avif,quality=80/';
  const staticPrefix = 'https://static.learnablemeta.com/';

  const isAlreadyWrapped = url.startsWith(cdnPrefix);
  const isStaticImage = url.startsWith(staticPrefix);
  const endsWithAvif = url.endsWith('.avif');

  if (!isAlreadyWrapped && isStaticImage && !endsWithAvif) {
    return `${cdnPrefix}${url}`;
  }

  return url;
}
