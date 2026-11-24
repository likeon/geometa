import { getMapInfo, logInfo, waitForElement } from './utils/main';
import {
  mountSummaryWindow,
  unmountSummaryWindow,
  unmountSummaryWindowOnRoundStart
} from './utils/summaryWindow';
import { createPinObserver, showMetaForRound } from './roundPins';
import { unsafeWindow } from '$';

//@ts-expect-error
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

export const RESULT_LIST_WRAPPER_SELECTOR = '[class*="_listWrapper_"]';
export const RESULT_LIST_ITEM_SELECTOR = '[class*="_listItemWrapper_"]';
export const RESULT_LIST_ROUND_NUMBER_SELECTOR = '[class*="_roundNumber_"]';

export function findBreakdownListWrapper(root: ParentNode = document): Element | null {
  for (const wrapper of root.querySelectorAll(RESULT_LIST_WRAPPER_SELECTOR)) {
    if (wrapper.querySelector(RESULT_LIST_ROUND_NUMBER_SELECTOR)) {
      return wrapper;
    }
  }
  return null;
}

let currentObserver: MutationObserver | null = null;
let currentPinObserver: MutationObserver | null = null;

function clearMetaCache() {
  if (window.geometaMetaCache) {
    window.geometaMetaCache.clear();
  }
}

export function initSinglePlayer() {
  if (!GeoGuessrEventFramework) {
    console.error('ALM: GeoGuessrEventFramework is not available - single player support disabled');
    return;
  }
  GeoGuessrEventFramework.init()
    .then(() => {
      GeoGuessrEventFramework.events.addEventListener('game_start', async (event: GGEvent) => {
        clearMetaCache();
        await getMapInfo(event.detail.map.id, true);
      });
      GeoGuessrEventFramework.events.addEventListener(
        'round_start',
        unmountSummaryWindowOnRoundStart
      );
      GeoGuessrEventFramework.events.addEventListener('round_end', async (event: GGEvent) => {
        unmountSummaryWindow();

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
          const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
          logInfo('adding app window');
          mountSummaryWindow(container, {
            roundNumber: event.detail.rounds.length,
            panoId: lastRound.location.panoId,
            mapId: event.detail.map.id,
            source: window.location.href.includes('challenge') ? 'challenge' : 'map'
          });
        });
      });
      GeoGuessrEventFramework.events.addEventListener('game_end', async (event: GGEvent) => {
        logInfo('game ended');

        const mapInfo = await getMapInfo(event.detail.map.id, false);
        if (!mapInfo.mapFound) {
          logInfo('not supported map for breakdown - skip');
          return;
        }

        const roundData = {
          rounds: event.detail.rounds,
          mapId: event.detail.map.id
        };

        waitForElement(RESULT_LIST_ROUND_NUMBER_SELECTOR).then((roundNumberEl) => {
          if (!roundNumberEl) {
            return;
          }
          addMetaButtonsToRounds(
            roundData.rounds,
            roundData.mapId,
            findBreakdownListWrapper() ?? document
          );
        });

        if (currentObserver) {
          currentObserver.disconnect();
        }

        currentObserver = new MutationObserver(() => {
          const listWrapper = findBreakdownListWrapper();
          if (listWrapper && !listWrapper.querySelector('.geometa-meta-btn')) {
            addMetaButtonsToRounds(roundData.rounds, roundData.mapId, listWrapper);
          }
        });

        currentObserver.observe(document.body, {
          childList: true,
          subtree: true
        });

        if (currentPinObserver) {
          currentPinObserver.disconnect();
        }
        currentPinObserver = createPinObserver(
          roundData.rounds.map((round) => round.location.panoId),
          roundData.mapId
        );
      });

      window.addEventListener('urlchange', () => {
        clearMetaCache();
        unmountSummaryWindow();
        if (currentObserver) {
          currentObserver.disconnect();
          currentObserver = null;
        }
        if (currentPinObserver) {
          currentPinObserver.disconnect();
          currentPinObserver = null;
        }
      });
    })
    .catch((e: unknown) => {
      console.error('ALM: GeoGuessrEventFramework failed to initialize', e);
    });
}

export function addMetaButtonsToRounds(
  rounds: GGEvent['detail']['rounds'],
  mapId: string,
  root: ParentNode = document
) {
  const roundItems = root.querySelectorAll(RESULT_LIST_ITEM_SELECTOR);

  // pair rows with rounds by the round number each row displays, so the
  // "Total" row's position (or any reordering) cannot misalign the buttons
  roundItems.forEach((roundItem) => {
    const roundNumberText = roundItem.querySelector(RESULT_LIST_ROUND_NUMBER_SELECTOR)?.textContent;
    const roundNumber = parseInt(roundNumberText || '');
    const round = rounds[roundNumber - 1];
    if (!round) return;

    if (roundItem.querySelector('.geometa-meta-btn')) return;

    roundItem.classList.add('geometa-round-item');

    const metaButton = document.createElement('button');
    metaButton.className = 'geometa-meta-btn';
    metaButton.textContent = 'Show meta';
    metaButton.title = 'View meta for this round';

    metaButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMetaForRound(round.location.panoId, mapId, roundNumber);
    });

    roundItem.appendChild(metaButton);
  });
}
