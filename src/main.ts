import App from "./App.svelte";
import { waitForElement } from "./lib/utils";

import { unsafeWindow } from "$";

function changelog() {
  return [
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

const metaMapIds = new Set([
  "66c0d3feff4dbe492e06174e",
  "66fd7c30b34ca9145ec96a6a",
  "66fda2e27e08dc03b5bb3d6e",
  "66fda2f8ee1c8ee4735e167f",
   "66fda3097e08dc03b5bb3f0e",
  "66fda319b477f9e4abdd34fa",
  "66fda32fbc5afd45d3eb187d",
  "66fda342413f41ca32ef9d54",
  "66fda352ee1c8ee4735e1aa8",
  "66fda3667e08dc03b5bb4309"]);

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
