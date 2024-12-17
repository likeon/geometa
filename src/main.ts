import App from './App.svelte';
import { getMapInfo, waitForElement } from './lib/utils';

import { unsafeWindow } from '$';
import { mount } from 'svelte';

function changelog() {
  return [
    { '0.71': 'Added beta support for live challanges' },
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

GeoGuessrEventFramework.init().then(() => {
  let pinChanged = false;
  const pinClass = 'div[data-qa="result-view-top"]';
  const observerTarget = document.body;

  new MutationObserver(async (mutations) => {
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
  }).observe(document.body, { subtree: true, childList: true });



  GeoGuessrEventFramework.events.addEventListener('game_start', async (event: GGEvent) => {
    await getMapInfo(event.detail.map.id, true);
  });
  GeoGuessrEventFramework.events.addEventListener('round_end', async (event: GGEvent) => {
    const mapInfo = await getMapInfo(event.detail.map.id, false);
    if (!mapInfo.mapFound) return;
    waitForElement('div[data-qa="result-view-top"]').then((container) => {
      const element = document.createElement('div');
      element.id = 'geometa-summary';
      container.appendChild(element);
      const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
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



const getChallengeId = () => {
  const regexp = /.*\/live-challenge\/(.*)/
  const matches = location.pathname.match(regexp)
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return null;
}

async function getChallengeInfo(id) {
  const url = `https://game-server.geoguessr.com/api/live-challenge/${id}`
  const response = await fetch(url, {
    method: "GET",
    credentials: "include"
  });
  const data = await response.json();
  const mapId = data.options.mapSlug;
  const currentRound = data.currentRoundNumber - 1
  const rounds = data.rounds
  const panorama = rounds[currentRound].question.panoramaQuestionPayload.panorama
  const panoIdHex = panorama.panoId
  const panoId = decodePanoId(panoIdHex)
  return { mapId, panoId }
}

function decodePanoId(encoded) {
  const len = Math.floor(encoded.length / 2)
  let panoId = []
  for (let i = 0; i < len; i++) {
    const code = parseInt(encoded.slice(i * 2, i * 2 + 2), 16)
    const char = String.fromCharCode(code)
    panoId = [...panoId, char]
  }
  return panoId.join("")
}