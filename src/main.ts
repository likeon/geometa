import App from "./App.svelte";
import {getMapInfo, waitForElement} from "./lib/utils";

import { unsafeWindow } from "$";

function changelog() {
  return [
    { "0.66": "Made note movable" },
    { "0.65": "Check map ids via API" },
    { "0.64": "Added more placeholder map ids" },
    { "0.63": "Added container resizing." },
    { "0.62": "Added images to metas." },
    { "0.61": "Added new/placehoder map ids." },
    { "0.6": "Bugfixes" },
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
  GeoGuessrEventFramework.events.addEventListener("game_start", async (event: GGEvent) => {
    await getMapInfo(event.detail.map.id, true);
  });
  GeoGuessrEventFramework.events.addEventListener("round_end", async (event: GGEvent) => {
    const mapInfo = await getMapInfo(event.detail.map.id, false);
    if (!mapInfo.mapFound) return;
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
