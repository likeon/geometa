import { unsafeWindow } from '$';
import { initSinglePlayer } from './lib/singlePlayer';
import { initLiveChallenge } from './lib/liveChallenge';
import { initURLChangeEvent } from './lib/utils/url';
import { initMapLabel } from './lib/mapLabel';
import { initLocationsUpload } from './lib/locationsUpload';

function changelog() {
  return [
    {'0.85': 'Another fix for multiple instances of upload button'},
    {'0.84': 'Fixed multiple instances of upload button, adjusted styles'},
    {'0.83': 'Added uploading locations and announcements system'},
    {'0.82': 'Changed position of LearnableMeta map label for new Geoguessr UI'},
    { '0.81': 'Fixed live challenge support. Added information about userscript version and source of a call (map, challenge, liveChallenge) to location info request to help us with debugging issues.' },
    { '0.80': 'Adjusted window dragging to work on mobile. Improved selection mechanism of elements with dynamic class names. Removed special handling of challenges.' },
    { '0.79': 'Fixed ALM meta list panel when switching to non-ALM map' },
    { '0.78': 'Added info window with version check' },
    { '0.77': 'Added custom footer to the note and clicking on link warning' },
    { '0.76': 'Redesign note and added meta list link' },
    { '0.75': 'Added basic logging to help with debugging issues' },
    { '0.74': 'Fixed window appearance when for some reason a negative position value is saved' },
    { '0.73': 'Fixed live challenge support and updated framework to newest version' },
    { '0.72': 'Adjusted images to fit vertically to the container to avoid scrolling and added magnifying glass effect on mouse hover' },
    { '0.71': 'Added beta support for live challenges' },
    { '0.70': 'Fixed carousel controls jumping and colored the note links' },
    { '0.69': 'Display multiple images with carousel' },
    { '0.68': 'Use panoId as unique location identifier, allow html in note' },
    { '0.67': 'Updated to Svelte 5' },
    { '0.66': 'Made note movable' },
    { '0.65': 'Check map ids via API' },
    { '0.64': 'Added more placeholder map ids' },
    { '0.63': 'Added container resizing.' },
    { '0.62': 'Added images to metas.' },
    { '0.61': 'Added new/placehoder map ids.' },
    { '0.6': 'Bugfixes' },
    { '0.5': 'New note format and prepared for multiple maps support' },
    {
      '0.4':
        'Updated GeoGuessr Event Framework version. Fixes the disappearing daily challenge from GeoGuessr home page.'
    }
  ];
}

//@ts-ignore
// so changelog doesn't get removed from the final script
if (unsafeWindow.notAValidVariable) {
  console.log(changelog());
}
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
