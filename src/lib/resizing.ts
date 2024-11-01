import { localStorageGetInt } from "./utils";
import { unsafeWindow } from "$";

const widthKey = "geometa:containerWidth";
const heightKey = "geometa:containerHeight";

export function setContainerDimensions(container: HTMLDivElement) {
  const containerWidth: number = localStorageGetInt(widthKey) || 500;
  const containerHeight: number = localStorageGetInt(heightKey) || 400;
  container.style.width = `${containerWidth}px`;
  container.style.height = `${containerHeight}px`;
}

export function saveContainerDimensions(entry: ResizeObserverEntry) {
  const containerWidth = entry.contentRect.width;
  const containerHeight = entry.contentRect.height;
  if (containerWidth !== 0 && containerHeight !== 0) {
    unsafeWindow.localStorage.setItem(widthKey, Math.floor(containerWidth).toString());
    unsafeWindow.localStorage.setItem(heightKey, Math.floor(containerHeight).toString());
  }
}
