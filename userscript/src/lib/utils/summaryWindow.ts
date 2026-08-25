import { mount, unmount } from 'svelte';
import App from '../App.svelte';

type SummaryProps = {
  roundNumber: number;
  panoId: string;
  mapId: string;
  userscriptVersion: string;
  source: 'map' | 'challenge' | 'liveChallenge';
};

let currentApp: Record<string, any> | null = null;
let currentElement: HTMLElement | null = null;
let pendingRoundStartObserver: MutationObserver | null = null;

function cancelPendingRoundStartUnmount() {
  pendingRoundStartObserver?.disconnect();
  pendingRoundStartObserver = null;
}

export function unmountSummaryWindow() {
  cancelPendingRoundStartUnmount();
  const element = currentElement ?? document.getElementById('geometa-summary');
  currentElement = null;
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  element?.remove();
}

export function unmountSummaryWindowOnRoundStart() {
  cancelPendingRoundStartUnmount();

  const element = document.getElementById('geometa-summary');
  const resultView = element?.closest('div[data-qa="result-view-top"]');
  if (!element || !resultView) {
    unmountSummaryWindow();
    return;
  }

  // Other userscripts can fetch the current game while the round result is open.
  // The event framework interprets that response as an early round_start, so wait
  // for GeoGuessr to actually remove this result view before cleaning up the popup.
  const unmountWhenDisconnected = () => {
    if (resultView.isConnected && element.isConnected) return;

    observer.disconnect();
    if (pendingRoundStartObserver === observer) pendingRoundStartObserver = null;
    if (currentElement === element) unmountSummaryWindow();
  };
  const observer = new MutationObserver(unmountWhenDisconnected);
  pendingRoundStartObserver = observer;
  observer.observe(document.body, { childList: true, subtree: true });
  unmountWhenDisconnected();
}

export function mountSummaryWindow(container: Element, props: SummaryProps) {
  unmountSummaryWindow();
  const element = document.createElement('div');
  element.id = 'geometa-summary';
  container.appendChild(element);
  currentElement = element;
  currentApp = mount(App, { target: element, props });
}
