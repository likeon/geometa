import { extractMapIdFromUrl, getMapInfo, waitForElement } from './utils/main';
import { mount } from 'svelte';
import MapLabel from './components/MapLabel.svelte';

export function initMapLabel() {
  addMapLabel();
  window.addEventListener('urlchange', () => {
    addMapLabel();
  });
}

async function addMapLabel() {
  const mapId = extractMapIdFromUrl(window.location.href);
  if (!mapId) {
    return;
  }

  const mapAvatarContainer = await waitForElement('[class*=map-block_mapImageContainer]');
  if (!mapAvatarContainer) {
    return;
  }

  const existingLabel = mapAvatarContainer.querySelector('.map-label');
  if (existingLabel) {
    existingLabel.remove();
  }

  const mapInfo = await getMapInfo(mapId, true);
  if (!mapInfo?.mapFound) {
    return;
  }

  const element = document.createElement('div');
  element.classList.add('map-label');
  mapAvatarContainer.appendChild(element);
  mount(MapLabel, {
    target: element,
    props: {
      mapId: mapId
    }
  });
}
