import { getMapInfo, waitForElement } from './utils/main';
import UploadLocations from './components/UploadLocations.svelte';
import { mount, unmount } from 'svelte';

export function extractMapIdFromMapMakerUrl(url: string) {
  const match = url.match(/\/map-maker\/([^/?#]+)/);
  return match ? match[1] : null;
}

const TOP_BAR_MENU_CLASS_SELECTOR = '[class*="_topBarMenu_"]';
const PUBLISH_BUTTON_SELECTOR = '[data-qa="open-publish-dialog"]';
const HAMBURGER_MENU_SELECTOR = '[data-qa="hamburger-menu"]';
export const TOP_BAR_WAIT_SELECTOR = `${TOP_BAR_MENU_CLASS_SELECTOR}, ${PUBLISH_BUTTON_SELECTOR}`;

export function findTopBarMenuContainer(root: ParentNode = document): Element | null {
  const byClass = root.querySelector(TOP_BAR_MENU_CLASS_SELECTOR);
  if (byClass) {
    return byClass;
  }

  const publishButton = root.querySelector(PUBLISH_BUTTON_SELECTOR);
  const hamburgerButton = root.querySelector(HAMBURGER_MENU_SELECTOR);
  if (hamburgerButton?.parentElement && publishButton) {
    if (hamburgerButton.parentElement.contains(publishButton)) {
      return hamburgerButton.parentElement;
    }
  }

  return publishButton?.parentElement ?? null;
}

export function findUploadInsertionPoint(container: Element): Element | null {
  const publishButton = container.querySelector(PUBLISH_BUTTON_SELECTOR);
  let current: Element | null = publishButton;
  while (current && current.parentElement !== container) {
    current = current.parentElement;
  }
  return current ?? container.lastElementChild;
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

  const matched = await waitForElement(TOP_BAR_WAIT_SELECTOR);
  if (token !== runToken || !matched) {
    return;
  }

  const container = findTopBarMenuContainer();
  if (container) {
    const target = document.createElement('div');
    target.id = containerId;
    container.insertBefore(target, findUploadInsertionPoint(container));
    uploadApp = mount(UploadLocations, {
      target,
      props: {
        mapId
      }
    });
  }
}
