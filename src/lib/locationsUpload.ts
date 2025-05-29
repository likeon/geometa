import { getMapInfo } from './utils/main';
import UploadLocations from './components/UploadLocations.svelte';
import { mount } from 'svelte';


export function extractMapIdFromMapMakerUrl(url: string) {
  const match = url.match(/\/map-maker\/([^\/]+)/);
  return match ? match[1] : null;
}


export function initLocationsUpload() {
  addLocationsUploadButtons();
  window.addEventListener('urlchange', () => {
    addLocationsUploadButtons();
  });
}

const containerId = 'geometa-locations-upload';

async function addLocationsUploadButtons() {
  const mapId = extractMapIdFromMapMakerUrl(window.location.href);
  if (!mapId) {
    return;
  }

  document.getElementById(containerId)?.remove();

  const mapInfo = await getMapInfo(mapId, true);
  if (!mapInfo?.mapFound) {
    return;
  }
  const container = document.querySelector('.top-bar-menu_topBarMenu__kd9zX');
  if (container) {
    const target = document.createElement('div');
    target.id = containerId;
    container.insertBefore(target, container.lastElementChild);
    mount(UploadLocations, {
      target,
      props: {
        mapId,
      }
    });
  }
}
