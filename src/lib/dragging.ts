import { unsafeWindow } from '$';

const leftKey = 'geometa:containerStyleLeft';
const topKey = 'geometa:containerStyleTop';

export let isDragging = false;
export let dragOffset = { x: 0, y: 0 };

function getSavedPosition(key: string) {
  const value = localStorage.getItem(key);
  if (value && value.startsWith('-')) {
    // do not consider negative values as valid option
    // somehow people manage to drag the window out of the screen
    return null;
  }
  return value
}

export function setContainerPosition(container: HTMLDivElement) {
  container.style.left = getSavedPosition(leftKey) ?? container.style.left;
  container.style.top = getSavedPosition(topKey) ?? container.style.top;
}

export const onPointerDown = (event: PointerEvent, container: HTMLDivElement) => {
  const target = event.target as HTMLElement;
  if (target.closest('a') || target.closest('button')) {
    return;
  }

  isDragging = true;

  container.setPointerCapture(event.pointerId);

  dragOffset = {
    x: event.clientX - container.getBoundingClientRect().left,
    y: event.clientY - container.getBoundingClientRect().top
  };

  event.preventDefault();
};

export const onPointerMove = (event: PointerEvent, container: HTMLDivElement) => {
  if (isDragging) {
    // Get viewport dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get the container's dimensions
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Calculate the new position of the note
    let newLeft = event.clientX - dragOffset.x;
    let newTop = event.clientY - dragOffset.y;

    // Ensure the container stays within the left boundary (cannot be negative)
    if (newLeft < 0) newLeft = 0;
    if (newLeft + containerWidth > windowWidth) {
      newLeft = windowWidth - containerWidth;
    }
    if (newTop < 0) newTop = 0;
    if (newTop + containerHeight > windowHeight) {
      newTop = windowHeight - containerHeight;
    }

    // Set the new position
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  }
};

export const onPointerUp = (event: PointerEvent, container: HTMLDivElement) => {
  isDragging = false;
  if (container && container.hasPointerCapture(event.pointerId)) {
    container.releasePointerCapture(event.pointerId);
  }

  unsafeWindow.localStorage.setItem(leftKey, container.style.left);
  unsafeWindow.localStorage.setItem(topKey, container.style.top);
};
