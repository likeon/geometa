import { mount, unmount } from 'svelte';
import MapGroupUpdate from './components/MapGroupUpdate.svelte';

const queryParameter = 'learnableMetaGroupId';
const containerId = 'learnablemeta-map-group-update';
const launcherButtonId = 'learnablemeta-update-maps-button';
const mapActionsClass = 'learnablemeta-map-actions';
let app: Record<string, any> | null = null;
let launcherObserver: MutationObserver | null = null;

function clearHandoffParameter() {
  const url = new URL(window.location.href);
  url.searchParams.delete(queryParameter);
  window.history.replaceState(window.history.state, '', url);
}

export function startMapGroupUpdate(groupId?: number) {
  if ((groupId !== undefined && (!Number.isSafeInteger(groupId) || groupId <= 0)) || app) return;

  const target = document.createElement('div');
  target.id = containerId;
  document.body.appendChild(target);
  app = mount(MapGroupUpdate, {
    target,
    props: {
      groupId,
      onClose: () => {
        if (app) unmount(app);
        app = null;
        target.remove();
        clearHandoffParameter();
      }
    }
  });
}

function removeLauncherButton() {
  document.getElementById(launcherButtonId)?.remove();
  document
    .querySelectorAll(`.${mapActionsClass}`)
    .forEach((container) => container.classList.remove(mapActionsClass));
}

function ensureLauncherButton() {
  if (!window.location.pathname.startsWith('/creator-hub')) {
    removeLauncherButton();
    return;
  }

  const createMapContainer = document.querySelector('[class*="creators-hub_createMapButton"]');
  const createMapButton = createMapContainer?.querySelector(`button:not(#${launcherButtonId})`);
  if (!createMapContainer || !createMapButton) return;

  createMapContainer.classList.add(mapActionsClass);
  if (document.getElementById(launcherButtonId)) return;

  const launcher = document.createElement('button');
  launcher.id = launcherButtonId;
  launcher.className = 'learnablemeta-yellow-button';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Update LearnableMeta maps');
  launcher.textContent = 'Update maps';
  launcher.addEventListener('click', () => startMapGroupUpdate());
  createMapContainer.insertBefore(launcher, createMapButton);
}

function refreshLauncherButton() {
  if (!window.location.pathname.startsWith('/creator-hub')) {
    launcherObserver?.disconnect();
    launcherObserver = null;
    removeLauncherButton();
    return;
  }

  ensureLauncherButton();
  if (launcherObserver) return;
  launcherObserver = new MutationObserver(ensureLauncherButton);
  launcherObserver.observe(document.body, { childList: true, subtree: true });
}

function handleCreatorHubNavigation() {
  if (window.location.pathname.startsWith('/creator-hub')) {
    const rawGroupId = new URL(window.location.href).searchParams.get(queryParameter);
    if (rawGroupId) startMapGroupUpdate(Number(rawGroupId));
  }
  refreshLauncherButton();
}

export function initMapGroupUpdate() {
  handleCreatorHubNavigation();
  window.addEventListener('urlchange', handleCreatorHubNavigation);
}
