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

export function unmountSummaryWindow() {
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  document.getElementById('geometa-summary')?.remove();
}

export function mountSummaryWindow(container: Element, props: SummaryProps) {
  unmountSummaryWindow();
  const element = document.createElement('div');
  element.id = 'geometa-summary';
  container.appendChild(element);
  currentApp = mount(App, { target: element, props });
}
