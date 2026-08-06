import { mount, unmount } from 'svelte';
import MapGroupUpdate from './components/MapGroupUpdate.svelte';

const queryParameter = 'learnableMetaGroupId';
const containerId = 'learnablemeta-map-group-update';
let app: Record<string, any> | null = null;

function clearHandoffParameter() {
  const url = new URL(window.location.href);
  url.searchParams.delete(queryParameter);
  window.history.replaceState(window.history.state, '', url);
}

export function startMapGroupUpdate(groupId: number) {
  if (!Number.isSafeInteger(groupId) || groupId <= 0 || app) return;

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

export function initMapGroupUpdate() {
  if (!window.location.pathname.startsWith('/creator-hub')) return;
  const rawGroupId = new URL(window.location.href).searchParams.get(queryParameter);
  if (!rawGroupId) return;
  startMapGroupUpdate(Number(rawGroupId));
}
