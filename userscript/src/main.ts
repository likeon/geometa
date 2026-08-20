import { GM_registerMenuCommand } from '$';
import { mount, unmount } from 'svelte';
import { initSinglePlayer } from './lib/singlePlayer';
import { initLiveChallenge } from './lib/liveChallenge';
import { initURLChangeEvent } from './lib/utils/url';
import { initMapLabel } from './lib/mapLabel';
import { initLocationsUpload } from './lib/locationsUpload';
import { initChallengeResults } from './lib/challengeResults';
import { resetContainerPosition } from './lib/utils/dragging';
import { resetContainerDimensions } from './lib/utils/resizing';
import { initMapGroupUpdate } from './lib/mapGroupUpdate';
import { initLiveChallengeIdTracking } from './lib/utils/liveChallengeId';
import ResetLayoutConfirmation from './lib/components/ResetLayoutConfirmation.svelte';
import { initMapArea } from './lib/mapArea';
import './lib/styles/theme.css';
import './lib/styles/buttons.css';
import './lib/styles/modals.css';

let resetDialogApp: Record<string, any> | null = null;

initMapArea();

function openResetLayoutDialog() {
  if (resetDialogApp) return;

  const target = document.createElement('div');
  target.id = 'learnablemeta-reset-layout-dialog';
  document.body.appendChild(target);

  function closeDialog() {
    if (resetDialogApp) unmount(resetDialogApp);
    resetDialogApp = null;
    target.remove();
  }

  resetDialogApp = mount(ResetLayoutConfirmation, {
    target,
    props: {
      onCancel: closeDialog,
      onConfirm: () => {
        resetContainerPosition();
        resetContainerDimensions();
        closeDialog();
        window.location.reload();
      }
    }
  });
}

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand('LearnableMeta - Reset Meta Window Layout', openResetLayoutDialog);
}

initURLChangeEvent();
initLiveChallengeIdTracking();

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
    ['locationsUpload', initLocationsUpload],
    ['challengeResults', initChallengeResults],
    ['mapGroupUpdate', initMapGroupUpdate]
  ];
  for (const [name, init] of features) {
    try {
      init();
    } catch (e) {
      console.error(`ALM: failed to initialize ${name}`, e);
    }
  }
}
