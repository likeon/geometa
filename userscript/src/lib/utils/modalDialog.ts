export type ModalDialogOptions = {
  onClose: () => void;
  closeOnEscape?: boolean;
};

const focusableSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function focusableElements(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hidden && element.getClientRects().length > 0
  );
}

export function modalDialog(node: HTMLElement, initialOptions: ModalDialogOptions) {
  let options = initialOptions;
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  function focusDialog() {
    if (!node.isConnected || node.contains(document.activeElement)) return;
    const initialFocus =
      node.querySelector<HTMLElement>('[data-modal-initial-focus]') ?? focusableElements(node)[0];
    if (initialFocus) {
      initialFocus.focus();
    } else {
      node.tabIndex = -1;
      node.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && options.closeOnEscape !== false) {
      event.preventDefault();
      event.stopPropagation();
      options.onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const elements = focusableElements(node);
    if (elements.length === 0) {
      event.preventDefault();
      node.focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey && (activeElement === first || !node.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !node.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);
  requestAnimationFrame(focusDialog);

  return {
    update(nextOptions: ModalDialogOptions) {
      options = nextOptions;
    },
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    }
  };
}
