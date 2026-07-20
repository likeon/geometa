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
    } catch {}

    const observer = new MutationObserver(() => {
      try {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          removeUrlChangeListener();
          resolve(element);
          return;
        }
      } catch {}
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

type CachedMapInfo = {
  mapInfo: MapInfoResponse;
  fetchedAt: number;
};

// maps get added to LearnableMeta over time, so re-check negative results sooner
const MAP_FOUND_CACHE_MS = 24 * 60 * 60 * 1000;
const MAP_NOT_FOUND_CACHE_MS = 60 * 60 * 1000;

function getCachedMapInfo(key: string): CachedMapInfo | null {
  const savedMapInfo = unsafeWindow.localStorage.getItem(key);
  if (!savedMapInfo) {
    return null;
  }
  try {
    const parsed = JSON.parse(savedMapInfo);
    // entries from older versions are the raw map info without a timestamp
    if (parsed && parsed.mapInfo && typeof parsed.fetchedAt === 'number') {
      return parsed as CachedMapInfo;
    }
  } catch {}
  return null;
}

export async function getMapInfo(geoguessrId: string, forceUpdate: boolean) {
  const localStorageMapInfoKey = `geometa:map-info:${geoguessrId}`;
  const cached = getCachedMapInfo(localStorageMapInfoKey);
  if (!forceUpdate && cached) {
    const ttl = cached.mapInfo.mapFound ? MAP_FOUND_CACHE_MS : MAP_NOT_FOUND_CACHE_MS;
    if (Date.now() - cached.fetchedAt < ttl) {
      logInfo('using saved map info', cached.mapInfo);
      return cached.mapInfo;
    }
  }
  const url = `https://learnablemeta.com/api/userscript/map/${geoguessrId}`;
  let mapInfo: MapInfoResponse;
  try {
    mapInfo = await fetchMapInfo(url);
  } catch (e) {
    if (cached) {
      logInfo('map info fetch failed - using stale cached map info', e);
      return cached.mapInfo;
    }
    throw e;
  }
  const toCache: CachedMapInfo = { mapInfo, fetchedAt: Date.now() };
  unsafeWindow.localStorage.setItem(localStorageMapInfoKey, JSON.stringify(toCache));
  unsafeWindow.localStorage.setItem('geometa:latest-version', mapInfo.userscriptVersion);
  return mapInfo;
}

export function getLatestVersionInfo() {
  return unsafeWindow.localStorage.getItem('geometa:latest-version');
}

function isNewerVersion(candidate: string, current: string) {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return diff > 0;
  }
  return false;
}

export function checkIfOutdated() {
  const latest = getLatestVersionInfo();
  if (!latest) {
    return false;
  }
  return isNewerVersion(latest, GM_info.script.version);
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
  let panoId = '';
  for (let i = 0; i + 2 <= encoded.length; i += 2) {
    panoId += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16));
  }
  return panoId;
}

export function logInfo(name: string, data?: any) {
  console.log(`ALM: ${name}`, data);
}

export function extractMapIdFromUrl(url: string) {
  const match = url.match(/\/maps\/([^\/]+)/);
  return match ? match[1] : null;
}
