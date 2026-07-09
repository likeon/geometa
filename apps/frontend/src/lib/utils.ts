import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function extractJsonData(file: File) {
  try {
    // Read the file content as text
    const text = await file.text();

    // Parse the text as JSON
    const jsonData = JSON.parse(text);

    // Return or process the JSON data
    return jsonData;
  } catch (error) {
    // Handle errors (e.g., invalid JSON)
    console.error('Error parsing JSON:', error);
    throw error;
  }
}

export async function geoguessrAPIFetch(
  url: string,
  { method = 'GET', headers, ...restOptions }: RequestInit = {}
) {
  const ncfaToken = env.NFCA_TOKEN || null;

  if (ncfaToken == null) {
    throw new Error('NFCA_TOKEN IS MISSING');
  }

  const defaultHeaders: HeadersInit = {
    Cookie: `_ncfa=${ncfaToken}`,
    'Content-Type': 'application/json'
  };

  const mergedHeaders: HeadersInit = {
    ...defaultHeaders,
    ...(headers || {})
  };

  return await fetch(url, {
    method,
    headers: mergedHeaders,
    ...restOptions
  });
}

type GeoguessrMapInfo = {
  id: string;
  numberOfGamesPlayed: number;
};

export async function geoguessrGetMapInfo(geoguessrId: string) {
  const url = `https://www.geoguessr.com/api/v3/search/map?page=0&count=1&q=${geoguessrId}`;

  const response = await geoguessrAPIFetch(url);
  if (!response.ok) throw error(response.status, 'Failed to fetch map info');
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
