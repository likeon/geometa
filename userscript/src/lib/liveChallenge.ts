import {
  getChallengeId,
  getChallengeInfo,
  getMapInfo,
  logInfo,
  waitForElement
} from './utils/main';
import { mountSummaryWindow, unmountSummaryWindow } from './utils/summaryWindow';

export function initLiveChallenge() {
  logInfo('live challenge support enabled');
  let pinChanged = false;
  const observer = new MutationObserver(async () => {
    if (!document.querySelector('[class*=result-map_roundPin]')) {
      pinChanged = false;
      return;
    }
    if (pinChanged) {
      return;
    }
    pinChanged = true;
    const challengeId = getChallengeId();
    if (!challengeId) {
      return;
    }
    try {
      const { mapId, panoId } = await getChallengeInfo(challengeId);
      const mapInfo = await getMapInfo(mapId, false);
      if (!mapInfo.mapFound) return;
      const container = await waitForElement('[class*=game_container]');
      if (!container) {
        return;
      }
      mountSummaryWindow(container, {
        // this is to display announcements and there is not easy way to calculate which round it is
        roundNumber: 4,
        panoId,
        mapId,
        userscriptVersion: mapInfo.userscriptVersion,
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
    pinChanged = false;
    unmountSummaryWindow();
  });

  if (document.body) {
    observer.observe(document.body, { subtree: true, childList: true });
  } else {
    console.error('document.body is not available.');
  }
}
