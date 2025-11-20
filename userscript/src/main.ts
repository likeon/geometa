import { initSinglePlayer } from './lib/singlePlayer';
import { initLiveChallenge } from './lib/liveChallenge';
import { initURLChangeEvent } from './lib/utils/url';
import { initMapLabel } from './lib/mapLabel';
import { initLocationsUpload } from './lib/locationsUpload';

initURLChangeEvent();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLearnableMetaFeatures);
} else {
  await setupLearnableMetaFeatures();
}

async function setupLearnableMetaFeatures() {
  initSinglePlayer();
  initLiveChallenge();
  initMapLabel();
  initLocationsUpload();
}
