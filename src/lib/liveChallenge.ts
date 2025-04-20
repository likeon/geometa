import { mount } from "svelte";
import { getChallengeId, getChallengeInfo, getMapInfo, logInfo, waitForElement } from "./utils/main";
import App from './App.svelte';

export function initLiveChallenge() {
  logInfo('live challenge support enabled');
  let pinChanged = false;
  const observer = new MutationObserver(async (mutations) => {
    if (!document.querySelector('[class*=result-map_roundPin]')) {
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
      waitForElement('[class*=game_container]').then((container) => {
        if (!container) {
          return;
        }
        const element = document.createElement('div');
        element.id = 'geometa-summary';
        container.appendChild(element);
        mount(App, {
          target: element,
          props: {
            panoId,
            mapId,
            userscriptVersion: mapInfo.userscriptVersion,
            source: 'liveChallenge'
          }
        });
      });
    }
  });

  if (document.body) {
    observer.observe(document.body, { subtree: true, childList: true });
  } else {
    console.error('document.body is not available.');
  }
}
