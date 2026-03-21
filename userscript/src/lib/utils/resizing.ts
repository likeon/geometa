import { localStorageGetInt } from './main';
import { unsafeWindow } from '$';

const widthKey = 'geometa:containerWidth';
const heightKey = 'geometa:containerHeight';

export function setContainerDimensions(container: HTMLDivElement) {
  const containerWidth: number = localStorageGetInt(widthKey) || 500;
  const containerHeight: number = localStorageGetInt(heightKey) || 400;
  container.style.width = `${containerWidth}px`;
  container.style.height = `${containerHeight}px`;
}

export function resetContainerDimensions() {
  unsafeWindow.localStorage.removeItem(widthKey);
  unsafeWindow.localStorage.removeItem(heightKey);
}

export function saveContainerDimensions(entry: ResizeObserverEntry) {
  const target = entry.target as HTMLElement;
  const containerWidth = target.offsetWidth;
  const containerHeight = target.offsetHeight;
  if (containerWidth !== 0 && containerHeight !== 0) {
    unsafeWindow.localStorage.setItem(widthKey, Math.floor(containerWidth).toString());
    unsafeWindow.localStorage.setItem(heightKey, Math.floor(containerHeight).toString());
  }
}
