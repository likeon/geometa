import { extractMapIdFromUrl, getMapInfo, waitForElement } from './utils/main';
import { mount, unmount } from 'svelte';
import MapLabel from './components/MapLabel.svelte';

export function initMapLabel() {
  addMapLabel();
  window.addEventListener('urlchange', () => {
    addMapLabel();
  });
}

let labelApp: Record<string, any> | null = null;
let runToken = 0;

function removeMapLabel() {
  if (labelApp) {
    unmount(labelApp);
    labelApp = null;
  }
  document.querySelector('.geometa-map-label')?.remove();
}

async function addMapLabel() {
  const token = ++runToken;

  const mapId = extractMapIdFromUrl(window.location.href);
  if (!mapId) {
    return;
  }

  // new map detail page layout first, old layout as fallback
  const mapAvatarContainer = await waitForElement(
    '[class*=map-detail-page_heroImageArea], [class*=map-block_mapImageContainer]'
  );
  if (token !== runToken || !mapAvatarContainer) {
    return;
  }

  const mapInfo = await getMapInfo(mapId, true);
  if (token !== runToken || !mapInfo?.mapFound) {
    return;
  }

  removeMapLabel();

  // the label is positioned absolutely against the container's bottom-right corner
  if (getComputedStyle(mapAvatarContainer).position === 'static') {
    (mapAvatarContainer as HTMLElement).style.position = 'relative';
  }

  const element = document.createElement('div');
  element.classList.add('geometa-map-label');
  mapAvatarContainer.appendChild(element);
  labelApp = mount(MapLabel, {
    target: element,
    props: {
      mapId: mapId
    }
  });
}
