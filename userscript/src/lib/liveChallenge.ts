import {
  getChallengeId,
  getChallengeInfo,
  getMapInfo,
  logInfo,
  waitForElement
} from './utils/main';
import { mountSummaryWindow, unmountSummaryWindow } from './utils/summaryWindow';

export const ROUND_PIN_SELECTOR = '[class*="_roundPin_"]';
export const LIVE_CHALLENGE_CONTAINER_SELECTOR =
  '[class*="game_container"], [data-game-hud][class*="_backdrop_"] ~ [class*="_container_"]';

export function initLiveChallenge() {
  logInfo('live challenge support enabled');
  let pinChanged = false;
  let generation = 0;
  const observer = new MutationObserver(async () => {
    if (!document.querySelector(ROUND_PIN_SELECTOR)) {
      if (pinChanged) {
        generation += 1;
        unmountSummaryWindow();
      }
      pinChanged = false;
      return;
    }
    if (pinChanged) {
      return;
    }
    pinChanged = true;
    const requestGeneration = ++generation;
    const challengeId = getChallengeId();
    if (!challengeId) {
      // A party game may render before its live-challenge request has been
      // observed. Keep trying while the result view changes.
      pinChanged = false;
      return;
    }
    try {
      const { mapId, panoId } = await getChallengeInfo(challengeId);
      if (requestGeneration !== generation) return;
      const mapInfo = await getMapInfo(mapId, false);
      if (requestGeneration !== generation) return;
      if (!mapInfo.mapFound) return;
      const container = await waitForElement(LIVE_CHALLENGE_CONTAINER_SELECTOR);
      if (
        !container ||
        requestGeneration !== generation ||
        !document.querySelector(ROUND_PIN_SELECTOR)
      ) {
        return;
      }
      mountSummaryWindow(container, {
        // this is to display announcements and there is not easy way to calculate which round it is
        roundNumber: 4,
        panoId,
        mapId,
        source: 'liveChallenge'
      });
    } catch (e) {
      logInfo('failed to show live challenge meta', e);
    }
  });

  window.addEventListener('urlchange', () => {
    if (getChallengeId()) {
      return;
    }
    generation += 1;
    pinChanged = false;
    unmountSummaryWindow();
  });

  if (document.body) {
    observer.observe(document.body, { subtree: true, childList: true });
  } else {
    console.error('document.body is not available.');
  }
}
