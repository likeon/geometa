import { GM_xmlhttpRequest, unsafeWindow, GM_info } from '$';


/**
 * Waits and returns an element with the specified selector.
 * Supports dynamic selectors like [class*=map-block_mapImageContainer].
 * Only works with class selectors!
 * Will stop looking when URL changes.
 */
export function waitForElement(selector: string): Promise<Element | null> {
  return new Promise((resolve) => {
    try {
      const existingElement = document.querySelector(selector);
      if (existingElement) {
        resolve(existingElement);
        return;
      }
    } catch {
    }

    const observer = new MutationObserver(() => {
      try {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          removeUrlChangeListener();
          resolve(element);
          return;
        }
      } catch {
      }
    });

    const handleUrlChange = () => {
      observer.disconnect();
      removeUrlChangeListener();
      resolve(null);
    };

    const removeUrlChangeListener = () => {
      window.removeEventListener('urlchange', handleUrlChange);
    };

    window.addEventListener('urlchange', handleUrlChange);

    // Start observing the document body for DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });
}

export function cutToTwoDecimals(num: number): string {
  const fixed = num.toFixed(2);
  // Remove trailing zeros after the decimal point
  return fixed.replace(/\.?0+$/, '');
}

export function localStorageGetInt(name: string) {
  const savedValue = unsafeWindow.localStorage.getItem(name);

  if (!savedValue) {
    return null;
  }

  const savedInt = parseInt(savedValue, 10);
  if (isNaN(savedInt)) {
    return null;
  }

  return savedInt;
}

type MapInfoResponse = {
  mapFound: boolean;
  userscriptVersion: string;
};

async function fetchMapInfo(url: string): Promise<MapInfoResponse> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: (response) => {
        if (response.status === 200 || response.status === 404) {
          try {
            const mapInfo = JSON.parse(response.responseText) as MapInfoResponse;
            logInfo('fetched map info', mapInfo);
            resolve(mapInfo);
          } catch (e) {
            logInfo('failed to parse map info response', e);
            reject('Failed to parse response');
          }
        } else {
          logInfo('failed to fetch map info', response);
          reject(`HTTP error! status: ${response.status}`);
        }
      },
      onerror: () => {
        reject('An error occurred while fetching data');
      }
    });
  });
}

export async function getMapInfo(geoguessrId: string, forceUpdate: boolean) {
  const localStorageMapInfoKey = `geometa:map-info:${geoguessrId}`;
  if (!forceUpdate) {
    const savedMapInfo = unsafeWindow.localStorage.getItem(localStorageMapInfoKey);
    if (savedMapInfo) {
      const mapInfo = JSON.parse(savedMapInfo) as MapInfoResponse;
      logInfo('using saved map info', mapInfo);
      return mapInfo;
    }
  }
  const url = `https://learnablemeta.com/api/map-info/${geoguessrId}`;
  const mapInfo = await fetchMapInfo(url);
  unsafeWindow.localStorage.setItem(localStorageMapInfoKey, JSON.stringify(mapInfo));
  unsafeWindow.localStorage.setItem('geometa:latest-version', mapInfo.userscriptVersion);
  return mapInfo;
}


export function getLatestVersionInfo() {
  return unsafeWindow.localStorage.getItem('geometa:latest-version');
}

export function checkIfOutdated() {
  return GM_info.script.version != getLatestVersionInfo();
}

export function markHelpMessageAsRead() {
  unsafeWindow.localStorage.setItem('geometa:help-message-read', 'true');
}

export function wasHelpMessageRead(): boolean {
  return unsafeWindow.localStorage.getItem('geometa:help-message-read') == 'true';
}

export const getChallengeId = () => {
  const regexp = /.*\/live-challenge\/(.*)/;
  const matches = location.pathname.match(regexp);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return null;
};

export async function getChallengeInfo(id: string) {
  const url = `https://game-server.geoguessr.com/api/live-challenge/${id}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  });
  const data = await response.json();
  const mapId = data.options.mapSlug;
  const currentRound = data.currentRoundNumber - 1;
  const rounds = data.rounds;
  const panorama = rounds[currentRound].question.panoramaQuestionPayload.panorama;
  const panoIdHex = panorama.panoId;
  const panoId = decodePanoId(panoIdHex);
  return { mapId, panoId };
}

export function decodePanoId(encoded: string) {
  const len = Math.floor(encoded.length / 2);
  let panoId: string[] = [];
  for (let i = 0; i < len; i++) {
    const code = parseInt(encoded.slice(i * 2, i * 2 + 2), 16);
    const char = String.fromCharCode(code);
    panoId = [...panoId, char];
  }
  return panoId.join('');
}

export function logInfo(name: string, data?: any) {
  console.log(`ALM: ${name}`, data);
}


export function extractMapIdFromUrl(url: string) {
  const match = url.match(/\/maps\/([^\/]+)/);
  return match ? match[1] : null;
}
