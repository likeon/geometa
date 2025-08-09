import { getMapInfo, logInfo, waitForElement } from './utils/main';
import { mount } from 'svelte';
import App from './App.svelte';
import { unsafeWindow } from '$';

//@ts-ignore
const GeoGuessrEventFramework = unsafeWindow.GeoGuessrEventFramework;
type GGEvent = {
  detail: {
    map: {
      id: string;
    };
    rounds: {
      location: {
        lat: number;
        lng: number;
        panoId: string;
      };
    }[];
  };
};

declare global {
  interface Window {
    geometaMetaCache?: Map<string, any>;
  }
}

let currentObserver: MutationObserver | null = null;
let currentPinObserver: MutationObserver | null = null;

function clearMetaCache() {
  if (window.geometaMetaCache) {
    window.geometaMetaCache.clear();
  }
}

export function initSinglePlayer() {
  GeoGuessrEventFramework.init().then(() => {
    GeoGuessrEventFramework.events.addEventListener('game_start', async (event: GGEvent) => {
      clearMetaCache();
      await getMapInfo(event.detail.map.id, true);
    });
    GeoGuessrEventFramework.events.addEventListener('round_end', async (event: GGEvent) => {
      document.getElementById('geometa-summary')?.remove();

      const mapInfo = await getMapInfo(event.detail.map.id, false);
      if (!mapInfo.mapFound) {
        logInfo('not supported map - skip');
        return;
      }
      logInfo('waiting for the result view to render');
      waitForElement('div[data-qa="result-view-top"]').then((container) => {
        if (!container) {
          return;
        }
        logInfo('the result view is rendered');
        const element = document.createElement('div');
        element.id = 'geometa-summary';
        container.appendChild(element);
        const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
        logInfo('adding app window');
        mount(App, {
          target: element,
          props: {
            roundNumber: event.detail.rounds.length,
            panoId: lastRound.location.panoId,
            mapId: event.detail.map.id,
            userscriptVersion: mapInfo.userscriptVersion,
            source: window.location.href.includes('challenge') ? 'challenge' : 'map'
          }
        });
      });
    });
    GeoGuessrEventFramework.events.addEventListener('game_end', async (event: GGEvent) => {
      console.log('game ended');
      const panoIds = event.detail.rounds.map((round) => round.location.panoId);
      console.log('All round pano IDs:', panoIds);

      const mapInfo = await getMapInfo(event.detail.map.id, false);
      if (!mapInfo.mapFound) {
        logInfo('not supported map for breakdown - skip');
        return;
      }

      const roundData = {
        rounds: event.detail.rounds,
        mapId: event.detail.map.id,
        userscriptVersion: mapInfo.userscriptVersion
      };

      waitForElement('.result-list_listWrapper__7SmiM').then((listWrapper) => {
        if (!listWrapper) {
          return;
        }
        addMetaButtonsToRounds(roundData.rounds, roundData.mapId, roundData.userscriptVersion);
      });

      if (currentObserver) {
        currentObserver.disconnect();
      }

      currentObserver = new MutationObserver(() => {
        const listWrapper = document.querySelector('.result-list_listWrapper__7SmiM');
        if (listWrapper && !listWrapper.querySelector('.geometa-meta-btn')) {
          addMetaButtonsToRounds(roundData.rounds, roundData.mapId, roundData.userscriptVersion);
        }
      });

      currentObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      addClickableIconsToPins(roundData.rounds, roundData.mapId, roundData.userscriptVersion);
    });

    window.addEventListener('urlchange', () => {
      clearMetaCache();
      if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
      }
      if (currentPinObserver) {
        currentPinObserver.disconnect();
        currentPinObserver = null;
      }
    });
  });
}

function addMetaButtonsToRounds(
  rounds: GGEvent['detail']['rounds'],
  mapId: string,
  userscriptVersion: string
) {
  const roundItems = document.querySelectorAll('.result-list_listItemWrapper___XCGn');

  rounds.forEach((round, index) => {
    const roundItem = roundItems[index];
    if (!roundItem) return;

    const roundNumber = roundItem.querySelector('.result-list_roundNumber__RlIKm')?.textContent;
    if (roundNumber === 'Total') return;

    if (roundItem.querySelector('.geometa-meta-btn')) return;

    const metaButton = document.createElement('button');
    metaButton.className = 'geometa-meta-btn';
    metaButton.textContent = 'Show meta';
    metaButton.title = 'View meta for this round';

    metaButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMetaForRound(round.location.panoId, mapId, userscriptVersion, index + 1);
    });

    roundItem.appendChild(metaButton);
  });
}

function showMetaForRound(
  panoId: string,
  mapId: string,
  userscriptVersion: string,
  roundNumber: number
) {
  let element = document.getElementById('geometa-summary');

  if (element) {
    element.innerHTML = '';
  } else {
    const container = document.querySelector('div[data-qa="result-view-top"]') || document.body;

    element = document.createElement('div');
    element.id = 'geometa-summary';
    container.appendChild(element);
  }

  mount(App, {
    target: element,
    props: {
      roundNumber,
      panoId,
      mapId,
      userscriptVersion,
      source: window.location.href.includes('challenge') ? 'challenge' : 'map'
    }
  });
}

function addClickableIconsToPins(
  rounds: GGEvent['detail']['rounds'],
  mapId: string,
  userscriptVersion: string
) {
  if (currentPinObserver) {
    currentPinObserver.disconnect();
  }

  currentPinObserver = new MutationObserver(() => {
    const pins = document.querySelectorAll('[class*="map-pin_mapPin"]');
    pins.forEach((pin) => {
      const pinText = pin.textContent?.trim();
      const roundNumber = parseInt(pinText || '');

      if (roundNumber >= 1 && roundNumber <= 5 && !pin.hasAttribute('data-geometa-pin-processed')) {
        pin.setAttribute('data-geometa-pin-processed', 'true');

        const questionIcon = document.createElement('div');
        questionIcon.className = 'geometa-pin-question';
        questionIcon.innerHTML = '?';
        questionIcon.title = `View meta for round ${roundNumber}`;

        questionIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const round = rounds[roundNumber - 1]; // Array is 0-indexed
          if (round) {
            showMetaForRound(round.location.panoId, mapId, userscriptVersion, roundNumber);
          }
        });

        const pinElement = pin as HTMLElement;
        if (pinElement.style.position === '' || pinElement.style.position === 'static') {
          pinElement.style.position = 'relative';
        }

        pinElement.appendChild(questionIcon);
      }
    });
  });

  // Start observing for map pins
  currentPinObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
}
