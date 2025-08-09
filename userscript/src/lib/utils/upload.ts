import { GM_xmlhttpRequest } from '$'; // Keep this if used in other parts of the file, not directly here

async function geoguessrAPIFetch(url: string, options: RequestInit = {}): Promise<Response> {
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

export async function uploadLocations(geoguessrId: string, apiKey: string): Promise<void> {
  const geoguessrDraftApiUrl = `https://www.geoguessr.com/api/v4/user-maps/drafts/${geoguessrId}`;
  let geoguessrMapDetails;

  try {
    const response = await geoguessrAPIFetch(geoguessrDraftApiUrl);
    geoguessrMapDetails = await response.json();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch Geoguessr map info:', error);
    throw new Error(`Geoguessr Error: Could not fetch map details. ${errorMessage}`);
  }

  const { avatar, description, highlighted, name, version } = geoguessrMapDetails;
  let locationsToUpload;

  try {
    locationsToUpload = await fetchMapLocationsGM(geoguessrId, apiKey);
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

  const mapDataToUpload = {
    avatar,
    description,
    highlighted,
    name,
    customCoordinates: locationsToUpload,
    version: version + 1
  };

  try {
    await geoguessrAPIFetch(geoguessrDraftApiUrl, {
      method: 'PUT',
      body: JSON.stringify(mapDataToUpload)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to update Geoguessr map draft:', error);
    throw new Error(`Geoguessr Error: Could not update map draft. ${errorMessage}`);
  }

  try {
    console.log('Publishing Geoguessr map...');
    await geoguessrAPIFetch(`${geoguessrDraftApiUrl}/publish`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to publish Geoguessr map:', error);
    throw new Error(`Geoguessr Error: Could not publish map. ${errorMessage}`);
  }
}

function fetchMapLocationsGM(geoguessrId: string, apiToken: string): Promise<[]> {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://learnablemeta.com/api/userscript/map/${geoguessrId}/locations`;

    GM_xmlhttpRequest({
      method: 'GET',
      url: apiUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000, // Add a timeout (e.g., 15 seconds)
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            if (data && Array.isArray(data.customCoordinates)) {
              resolve(data.customCoordinates);
            } else {
              console.error('Unexpected data structure from backend:', data);
              reject(new Error('Received invalid location data structure from backend.'));
            }
          } catch (parseError: any) {
            console.error(
              'Error parsing JSON response from backend:',
              parseError,
              response.responseText
            );
            reject(
              new Error(
                `Backend Error: Failed to parse location data: ${parseError.message.substring(0, 100)}`
              )
            );
          }
        } else {
          let errorMessage = `Backend Error (${response.status}): ${response.statusText || 'Failed to fetch locations'}`;
          let rawErrorResponse = response.responseText;
          try {
            const parsedJsonError = JSON.parse(response.responseText);
            if (parsedJsonError && parsedJsonError.message) {
              errorMessage = `Backend Error (${response.status}): ${parsedJsonError.message}`;
            } else if (parsedJsonError) {
              errorMessage = `Backend Error (${response.status}): ${JSON.stringify(parsedJsonError).substring(0, 100)}...`;
            }
            rawErrorResponse = parsedJsonError;
          } catch (e) {
            if (response.responseText) {
              errorMessage = `Backend Error (${response.status}): ${response.responseText.substring(0, 100)}...`;
            }
          }
          console.error(
            `Error fetching map locations from backend (Status: ${response.status}):`,
            rawErrorResponse
          );
          reject(new Error(errorMessage));
        }
      },
      onerror: (error) => {
        console.error('Failed to fetch map locations (XHR onerror):', error);
        let detail = (error as any).error || (error as any).statusText || 'Network request failed';
        reject(new Error(`Network Error: Could not reach backend to fetch locations. ${detail}`));
      },
      ontimeout: () => {
        console.error('Failed to fetch map locations: Request timed out', apiUrl);
        reject(new Error('Backend Timeout: Request to fetch locations timed out.'));
      }
    });
  });
}
