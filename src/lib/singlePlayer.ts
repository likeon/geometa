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

export function initSinglePlayer() {
  GeoGuessrEventFramework.init().then(() => {
    GeoGuessrEventFramework.events.addEventListener('game_start', async (event: GGEvent) => {
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
            source: (window.location.href.includes('challenge') ? 'challenge' : 'map')
          }
        });
      });
    });
  });
}
