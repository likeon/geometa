export async function geoguessrAPIFetch(
  url: string,
  { method = 'GET', headers, ...restOptions }: RequestInit = {},
) {
  const ncfaToken = process.env.NFCA_TOKEN || null;

  if (ncfaToken == null) {
    throw new Error('NFCA_TOKEN IS MISSING');
  }

  const defaultHeaders: HeadersInit = {
    Cookie: `_ncfa=${ncfaToken}`,
    'Content-Type': 'application/json',
  };

  const mergedHeaders: HeadersInit = {
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
  if (mapInfo.id != geoguessrId) {
    // found map id doesn't match the requested id
    // probably in cases where not an actual map id was provided
    // treat it the same as map not found
    return null;
  }

  return mapInfo;
}

//for metas that are taken not from syncedMeta images have no compression, we can remove it later when most map will be on new system
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
