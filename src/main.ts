import App from './App.svelte';
import { getChallengeId, getChallengeInfo, getMapInfo, logInfo, waitForElement } from './lib/utils';

import { unsafeWindow } from '$';
import { mount } from 'svelte';

function changelog() {
  return [
    {'0.77' : "Added custom footer to the note and clicking on link warning"},
    { '0.76': 'Redesign note and added meta list link' },
    { '0.75': 'Added basic logging to help with debugging issues' },
    { '0.74': 'Fixed window appearance when for some reason a negative position value is saved' },
    { '0.73': 'Fixed live challenge support and updated framework to newest version' },
    { '0.72': 'Adjusted images to fit vertically to the container to avoid scrolling and added magnifying glass effect on mouse hover' },
    { '0.71': 'Added beta support for live challenges' },
    { '0.70': 'Fixed carousel controls jumping and colored the note links' },
    { '0.69': 'Display multiple images with carousel' },
    { '0.68': 'Use panoId as unique location identifier, allow html in note' },
    { '0.67': 'Updated to Svelte 5' },
    { '0.66': 'Made note movable' },
    { '0.65': 'Check map ids via API' },
    { '0.64': 'Added more placeholder map ids' },
    { '0.63': 'Added container resizing.' },
    { '0.62': 'Added images to metas.' },
    { '0.61': 'Added new/placehoder map ids.' },
    { '0.6': 'Bugfixes' },
    { '0.5': 'New note format and prepared for multiple maps support' },
    {
      '0.4':
        'Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page.'
    }
  ];
}

//@ts-ignore
// so changelog doesn't get removed from the final script
if (unsafeWindow.notAValidVariable) {
  console.log(changelog());
}

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


// Single player
GeoGuessrEventFramework.init().then(() => {
  GeoGuessrEventFramework.events.addEventListener('game_start', async (event: GGEvent) => {
    await getMapInfo(event.detail.map.id, true);
  });
  GeoGuessrEventFramework.events.addEventListener('round_end', async (event: GGEvent) => {
    const mapInfo = await getMapInfo(event.detail.map.id, false);
    if (!mapInfo.mapFound) {
      logInfo('not supported map - skip')
      return
    }
    logInfo('waiting for the result view to render')
    waitForElement('div[data-qa="result-view-top"]').then((container) => {
      logInfo('the result view is rendered')
      const element = document.createElement('div');
      element.id = 'geometa-summary';
      container.appendChild(element);
      const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
      logInfo('adding app window')
      mount(App, {
        target: element,
        props: {
          panoId: lastRound.location.panoId,
          mapId: event.detail.map.id
        }
      });
    });
  });
});


// Live Challenge

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initLiveChallengeObserver();
  });
} else {
  initLiveChallengeObserver();
}

function initLiveChallengeObserver() {
  logInfo('live challenge support enabled')
  let pinChanged = false;
  const observer = new MutationObserver(async (mutations) => {
    const pinClass = ".result-map_roundPin__3ieXw";
    if (!document.querySelector(pinClass)) {
      pinChanged = false;
      return;
    }
    if (pinChanged) {
      return;
    }
    pinChanged = true;
    const challengeId = getChallengeId();
    if (challengeId) {
      const { mapId, panoId } = await getChallengeInfo(challengeId);
      const mapInfo = await getMapInfo(mapId, false);
      if (!mapInfo.mapFound) return;
      waitForElement('div.game_container__5bsqO').then((container) => {
        const element = document.createElement('div');
        element.id = 'geometa-summary';
        container.appendChild(element);
        mount(App, {
          target: element,
          props: {
            panoId,
            mapId
          }
        });
      });
    }
  });

  if (document.body) {
    observer.observe(document.body, { subtree: true, childList: true });
  } else {
    console.error("document.body is not available.");
  }
}

