type HistoryMethod = 'pushState' | 'replaceState';

export function initURLChangeEvent() {
  overrideHistoryMethod('pushState');
  overrideHistoryMethod('replaceState');
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('urlchange'));
  });
}

function overrideHistoryMethod(method: HistoryMethod) {
  const original = history[method];

  history[method] = function(this: History, state: any, title: string, url?: string | URL | null) {
    const result = original.call(this, state, title, url);
    window.dispatchEvent(new Event('urlchange'));
    return result;
  } as typeof history[HistoryMethod];
}
