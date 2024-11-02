import { unsafeWindow } from '$';

const leftKey = 'geometa:containerStyleLeft';
const topKey = 'geometa:containerStyleTop';

export let isDragging = false;
export let dragOffset = { x: 0, y: 0 };

export function setContainerPosition(container: HTMLDivElement) {
  container.style.left = localStorage.getItem(leftKey) ?? container.style.left;
  container.style.top = localStorage.getItem(topKey) ?? container.style.top;
}

export const onMouseDown = (event: MouseEvent, container: HTMLDivElement) => {
  isDragging = true;
  dragOffset = {
    x: event.clientX - container.getBoundingClientRect().left,
    y: event.clientY - container.getBoundingClientRect().top
  };
  event.preventDefault();
};

export const onMouseMove = (event: MouseEvent, container: HTMLDivElement) => {
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
    // Ensure the container stays within the right boundary (cannot go off-screen)
    if (newLeft + containerWidth > windowWidth) newLeft = windowWidth - containerWidth;

    // Ensure the container stays within the top boundary (cannot be negative)
    if (newTop < 0) newTop = 0;
    // Ensure the container stays within the bottom boundary (cannot go off-screen)
    if (newTop + containerHeight > windowHeight) newTop = windowHeight - containerHeight;

    // Set the new position
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  }
};

export const onMouseUp = (container: HTMLDivElement) => {
  isDragging = false;
  unsafeWindow.localStorage.setItem(leftKey, container.style.left);
  unsafeWindow.localStorage.setItem(topKey, container.style.top);
};
