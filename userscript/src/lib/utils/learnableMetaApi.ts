import { GM_xmlhttpRequest } from '$';
import type { ManagedMapCoordinate } from './mapFingerprint';

export class LearnableMetaApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'LearnableMetaApiError';
  }
}

export type MapGroupManifest = {
  group: {
    id: number;
    name: string;
    syncedAt: number;
  };
  maps: {
    name: string;
    geoguessrId: string;
    locationCount: number;
    fingerprint: string;
  }[];
};

export type AccessibleMapGroup = {
  id: number;
  name: string;
  syncedAt: number;
  mapCount: number;
};

export type SyncedMapCoordinate = ManagedMapCoordinate & {
  countryCode: null;
  stateCode: null;
};

function requestJson<T>(url: string, apiToken: string): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      onload: (response) => {
        let body: unknown;
        try {
          body = response.responseText ? JSON.parse(response.responseText) : null;
        } catch {
          body = response.responseText;
        }

        if (response.status >= 200 && response.status < 300) {
          resolve(body as T);
          return;
        }

        const apiMessage =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : response.statusText || 'Request failed';
        reject(
          new LearnableMetaApiError(
            response.status,
            `LearnableMeta API error (${response.status}): ${apiMessage}`
          )
        );
      },
      onerror: () => reject(new LearnableMetaApiError(0, 'Could not reach LearnableMeta')),
      ontimeout: () => reject(new LearnableMetaApiError(0, 'LearnableMeta request timed out'))
    });
  });
}

export function fetchMapGroupManifest(
  groupId: number,
  apiToken: string
): Promise<MapGroupManifest> {
  return requestJson(
    `https://learnablemeta.com/api/userscript/map-group/${groupId}/maps`,
    apiToken
  );
}

export async function fetchAccessibleMapGroups(apiToken: string): Promise<AccessibleMapGroup[]> {
  const data = await requestJson<{ groups: AccessibleMapGroup[] }>(
    'https://learnablemeta.com/api/userscript/map-groups',
    apiToken
  );
  if (!Array.isArray(data.groups)) {
    throw new LearnableMetaApiError(0, 'Received invalid map group data');
  }
  return data.groups;
}

export async function fetchSyncedMapLocations(
  geoguessrId: string,
  apiToken: string,
  expectedFingerprint?: string
): Promise<SyncedMapCoordinate[]> {
  const query = expectedFingerprint
    ? `?expectedFingerprint=${encodeURIComponent(expectedFingerprint)}`
    : '';
  const data = await requestJson<{ customCoordinates: SyncedMapCoordinate[] }>(
    `https://learnablemeta.com/api/userscript/map/${geoguessrId}/locations${query}`,
    apiToken
  );
  if (!Array.isArray(data.customCoordinates)) {
    throw new LearnableMetaApiError(0, 'Received invalid map location data');
  }
  return data.customCoordinates;
}
