import { getMapInfo } from './utils/main';
import UploadLocations from './components/UploadLocations.svelte';
import { mount, unmount } from 'svelte';

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

let uploadApp: Record<string, any> | null = null;
let runToken = 0;

function removeUploadButton() {
  if (uploadApp) {
    unmount(uploadApp);
    uploadApp = null;
  }
  document.getElementById(containerId)?.remove();
}

async function addLocationsUploadButtons() {
  const token = ++runToken;

  removeUploadButton();

  const mapId = extractMapIdFromMapMakerUrl(window.location.href);
  if (!mapId) {
    return;
  }

  const mapInfo = await getMapInfo(mapId, true);
  if (token !== runToken || !mapInfo?.mapFound) {
    return;
  }

  const container = document.querySelector('.top-bar-menu_topBarMenu__kd9zX');

  if (container) {
    const target = document.createElement('div');
    target.id = containerId;
    container.insertBefore(target, container.lastElementChild);
    uploadApp = mount(UploadLocations, {
      target,
      props: {
        mapId
      }
    });
  }
}
