import { GM_registerMenuCommand } from '$';
import { initSinglePlayer } from './lib/singlePlayer';
import { initLiveChallenge } from './lib/liveChallenge';
import { initURLChangeEvent } from './lib/utils/url';
import { initMapLabel } from './lib/mapLabel';
import { initLocationsUpload } from './lib/locationsUpload';
import { resetContainerPosition } from './lib/utils/dragging';
import { resetContainerDimensions } from './lib/utils/resizing';

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand('LearnableMeta - Reset Meta Window Layout', () => {
    if (confirm('Reset the LearnableMeta window position and size?')) {
      resetContainerPosition();
      resetContainerDimensions();
      window.location.reload();
    }
  });
}

initURLChangeEvent();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLearnableMetaFeatures);
} else {
  await setupLearnableMetaFeatures();
}

async function setupLearnableMetaFeatures() {
  const features: [string, () => void][] = [
    ['singlePlayer', initSinglePlayer],
    ['liveChallenge', initLiveChallenge],
    ['mapLabel', initMapLabel],
    ['locationsUpload', initLocationsUpload]
  ];
  for (const [name, init] of features) {
    try {
      init();
    } catch (e) {
      console.error(`ALM: failed to initialize ${name}`, e);
    }
  }
}
