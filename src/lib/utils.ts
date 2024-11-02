import { GM_xmlhttpRequest, unsafeWindow } from '$';

export function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    // If not, set up a MutationObserver to watch for it
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
            return;
          }
        }
      }
    });

    // Start observing the document body for DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
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
            resolve(mapInfo);
          } catch (e) {
            reject('Failed to parse response');
          }
        } else {
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
  const localStorageKey = `geometa:map-info:${geoguessrId}`;
  if (!forceUpdate) {
    const savedMapInfo = unsafeWindow.localStorage.getItem(localStorageKey);
    if (savedMapInfo) {
      return JSON.parse(savedMapInfo) as MapInfoResponse;
    }
  }
  const url = `https://learnablemeta.com/api/map-info/${geoguessrId}`;
  const mapInfo = await fetchMapInfo(url);
  unsafeWindow.localStorage.setItem(localStorageKey, JSON.stringify(mapInfo));
  return mapInfo;
}
