import { expect, mock, test } from 'bun:test';

const pageWindow: Record<string, any> = {};
mock.module('$', () => ({ unsafeWindow: pageWindow }));

const { clearMapArea, showMapArea } = await import('../src/lib/mapArea');

test('React fallback rendering settles its queues', () => {
  const microtasks: VoidFunction[] = [];
  const frames: FrameRequestCallback[] = [];
  const fitCalls: { bounds: unknown; padding?: number }[] = [];

  const originalBounds = { extend: () => originalBounds };
  const mapDiv = {
    isConnected: true,
    getClientRects: () => [{}]
  };
  const map = {
    fitBounds(bounds: unknown, padding?: number) {
      fitCalls.push({ bounds, padding });
    },
    getBounds: () => originalBounds,
    getDiv: () => mapDiv
  };
  const mapElement = {
    __reactFiberTest: {
      return: { memoizedState: { memoizedState: { current: { instance: map } } } }
    }
  };
  const resultView = {
    querySelector: () => mapElement,
    contains: () => false
  };
  const documentMock = {
    querySelector: (selector: string) =>
      selector === 'div[data-qa="result-view-top"]' ? resultView : null
  };

  class DataLayerMock {
    addGeoJson() {
      return [];
    }
    setMap(nextMap: unknown) {
      void nextMap;
    }
    setStyle() {}
  }

  class BoundsMock {
    constructor(_bounds: unknown) {}
    extend() {
      return this;
    }
  }

  class MutationObserverMock {
    observe() {}
    disconnect() {}
  }

  const savedGlobals = {
    document: globalThis.document,
    MutationObserver: globalThis.MutationObserver,
    queueMicrotask: globalThis.queueMicrotask,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };
  Object.assign(globalThis, {
    document: documentMock,
    MutationObserver: MutationObserverMock,
    queueMicrotask: (callback: VoidFunction) => microtasks.push(callback),
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }
  });
  pageWindow.document = documentMock;
  pageWindow.google = {
    maps: {
      Data: DataLayerMock,
      LatLngBounds: BoundsMock,
      SymbolPath: { CIRCLE: 0 }
    }
  };

  try {
    showMapArea({ type: 'FeatureCollection', features: [] });

    let turns = 0;
    while (microtasks.length || frames.length) {
      if (++turns > 10) throw new Error('render queues did not settle');
      for (const callback of microtasks.splice(0)) callback();
      for (const callback of frames.splice(0)) callback(0);
    }

    expect(turns).toBe(1);
    expect(fitCalls).toHaveLength(1);
  } finally {
    clearMapArea();
    Object.assign(globalThis, savedGlobals);
  }
});
