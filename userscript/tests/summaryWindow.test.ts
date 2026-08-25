import { expect, mock, test } from 'bun:test';

const svelteUnmount = mock(() => {});
mock.module('svelte', () => ({ mount: () => ({}), unmount: svelteUnmount }));
mock.module('../src/lib/App.svelte', () => ({ default: {} }));

const { mountSummaryWindow, unmountSummaryWindow, unmountSummaryWindowOnRoundStart } = await import(
  '../src/lib/utils/summaryWindow'
);

test('keeps the summary open until the visible round result is removed', () => {
  let removed = false;
  let currentSummary: Record<string, any> | null = null;
  const resultView = { isConnected: true };
  const summary = {
    id: '',
    isConnected: false,
    closest: (selector: string) =>
      selector === 'div[data-qa="result-view-top"]' ? resultView : null,
    remove() {
      removed = true;
      this.isConnected = false;
      currentSummary = null;
    }
  };
  const container = {
    appendChild(element: typeof summary) {
      element.isConnected = true;
      currentSummary = element;
    }
  };

  const callbacks: MutationCallback[] = [];
  class MutationObserverMock {
    constructor(callback: MutationCallback) {
      callbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  }

  const savedGlobals = {
    document: globalThis.document,
    MutationObserver: globalThis.MutationObserver
  };
  Object.assign(globalThis, {
    document: {
      body: {},
      createElement: () => summary,
      getElementById: () => (currentSummary?.isConnected ? currentSummary : null)
    },
    MutationObserver: MutationObserverMock
  });

  try {
    mountSummaryWindow(container as unknown as Element, {
      roundNumber: 1,
      panoId: 'pano',
      mapId: 'map',
      userscriptVersion: 'test',
      source: 'map'
    });
    unmountSummaryWindowOnRoundStart();
    expect(removed).toBeFalse();
    expect(svelteUnmount).toHaveBeenCalledTimes(0);
    expect(callbacks).toHaveLength(1);

    resultView.isConnected = false;
    summary.isConnected = false;
    expect(document.getElementById('geometa-summary')).toBeNull();
    callbacks[0]([], {} as MutationObserver);
    expect(removed).toBeTrue();
    expect(svelteUnmount).toHaveBeenCalledTimes(1);
  } finally {
    unmountSummaryWindow();
    Object.assign(globalThis, savedGlobals);
  }
});
