import { fetchSyncedMapLocations, type SyncedMapCoordinate } from './learnableMetaApi';
import type { GeoGuessrDraftCoordinates } from './geoguessrDraft';

export async function geoguessrAPIFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { method = 'GET', headers: initialHeaders, body, ...restOptions } = options;

  const effectiveHeaders = new Headers(initialHeaders);
  effectiveHeaders.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    method,
    headers: effectiveHeaders,
    body,
    ...restOptions
  });

  if (!response.ok) {
    let errorPayload: any = null;
    let errorMessage = `Request to ${url.substring(0, 100)}... failed with status ${response.status}: ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorPayload = await response.json();
        if (errorPayload && errorPayload.message) {
          errorMessage = `API Error (${response.status}): ${errorPayload.message}`;
        } else if (errorPayload) {
          errorMessage = `API Error (${response.status}) for ${url.substring(0, 50)}...: ${JSON.stringify(errorPayload).substring(0, 100)}...`;
        }
      } else {
        const errorText = await response.text();
        errorPayload = errorText;
        if (errorText) {
          errorMessage = `API Error (${response.status}) for ${url.substring(0, 50)}...: ${errorText.substring(0, 100)}...`;
        }
      }
    } catch (e) {
      console.warn('Could not parse error response body from Geoguessr API:', e);
    }
    console.error(
      `geoguessrAPIFetch Error (Status: ${response.status}) for URL ${url}:`,
      errorMessage,
      'Full Payload:',
      errorPayload
    );
    throw new Error(errorMessage);
  }

  return response;
}

export type GeoGuessrDraft = GeoGuessrDraftCoordinates & {
  avatar: unknown;
  description: string;
  highlighted: boolean;
  name: string;
  version: number;
};

function draftUrl(geoguessrId: string) {
  return `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;
}

export async function getGeoguessrDraft(geoguessrId: string): Promise<GeoGuessrDraft> {
  const response = await geoguessrAPIFetch(draftUrl(geoguessrId));
  return response.json();
}

export async function updateGeoguessrDraft(
  geoguessrId: string,
  draft: GeoGuessrDraft,
  customCoordinates: SyncedMapCoordinate[]
): Promise<void> {
  const { avatar, description, highlighted, name, version } = draft;
  await geoguessrAPIFetch(draftUrl(geoguessrId), {
    method: 'PUT',
    body: JSON.stringify({
      avatar,
      description,
      highlighted,
      name,
      customCoordinates,
      version: version + 1
    })
  });
}

export async function publishGeoguessrDraft(geoguessrId: string): Promise<void> {
  await geoguessrAPIFetch(`${draftUrl(geoguessrId)}/publish`, {
    method: 'PUT',
    body: JSON.stringify({})
  });
}

export async function uploadLocations(geoguessrId: string, apiKey: string): Promise<void> {
  let geoguessrMapDetails;

  try {
    geoguessrMapDetails = await getGeoguessrDraft(geoguessrId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch Geoguessr map info:', error);
    throw new Error(`Geoguessr Error: Could not fetch map details. ${errorMessage}`);
  }

  let locationsToUpload;

  try {
    locationsToUpload = await fetchSyncedMapLocations(geoguessrId, apiKey);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch map locations from backend:', error);
    throw new Error(`LearnableMeta Error: ${errorMessage}`);
  }

  if (!locationsToUpload || locationsToUpload.length === 0) {
    const errorMessage =
      'Cannot publish an empty map. Please add locations via LearnableMeta first.';
    console.warn(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    await updateGeoguessrDraft(geoguessrId, geoguessrMapDetails, locationsToUpload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to update Geoguessr map draft:', error);
    throw new Error(`Geoguessr Error: Could not update map draft. ${errorMessage}`);
  }

  try {
    console.log('Publishing Geoguessr map...');
    await publishGeoguessrDraft(geoguessrId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to publish Geoguessr map:', error);
    throw new Error(`Geoguessr Error: Could not publish map. ${errorMessage}`);
  }
}
