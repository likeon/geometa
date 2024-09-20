import App from './App.svelte';
import {waitForElement} from './lib/utils'

import {unsafeWindow} from "$";

const changelog = {
  '0.4': 'Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page.'
}

//@ts-ignore
const GeoGuessrEventFramework = unsafeWindow.GeoGuessrEventFramework;

const metaMapId = '66c0d3feff4dbe492e06174e'

type GGEvent = {
  detail: {
    map: {
      id: string
    },
    rounds: {
      location: {
        lat: number,
        lng: number
      }
    }[]
  }
}

GeoGuessrEventFramework.init().then(() => {
  GeoGuessrEventFramework.events.addEventListener('round_end', (event: GGEvent) => {
    if (event.detail.map.id != metaMapId) return;
    waitForElement('div[data-qa="result-view-top"]').then((container) => {
      const element = document.createElement('div');
      element.id = 'geometa-summary';
      container.appendChild(element);
      const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
      new App({
        target: element,
        props: {
          lat: lastRound.location.lat,
          lng: lastRound.location.lng,
        }
      });
    })
  });
});
