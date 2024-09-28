import App from "./App.svelte";
import { waitForElement } from "./lib/utils";

import { unsafeWindow } from "$";

function changelog() {
  return [
    { "0.5": "New note format and prepared for multiple maps support" },
    {
      "0.4":
        "Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page.",
    },
  ];
}

//@ts-ignore
// so changelog doesn't get removed from the final script
if (unsafeWindow.notAValidVariable) {
  console.log(changelog());
}

//@ts-ignore
const GeoGuessrEventFramework = unsafeWindow.GeoGuessrEventFramework;

const metaMapIds = new Set(["66c0d3feff4dbe492e06174e"]);

type GGEvent = {
  detail: {
    map: {
      id: string;
    };
    rounds: {
      location: {
        lat: number;
        lng: number;
      };
    }[];
  };
};

GeoGuessrEventFramework.init().then(() => {
  GeoGuessrEventFramework.events.addEventListener("round_end", (event: GGEvent) => {
    if (!metaMapIds.has(event.detail.map.id)) return;
    waitForElement('div[data-qa="result-view-top"]').then((container) => {
      const element = document.createElement("div");
      element.id = "geometa-summary";
      container.appendChild(element);
      const lastRound = event.detail.rounds[event.detail.rounds.length - 1];
      new App({
        target: element,
        props: {
          lat: lastRound.location.lat,
          lng: lastRound.location.lng,
          mapId: event.detail.map.id,
        },
      });
    });
  });
});
