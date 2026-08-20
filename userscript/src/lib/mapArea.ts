import { unsafeWindow } from '$';

type GeoJson = Record<string, unknown>;

type LatLngBounds = {
  extend(point: unknown): LatLngBounds;
};

type BoundsInput = LatLngBounds | { east: number; north: number; south: number; west: number };

type GoogleMap = {
  fitBounds(bounds: BoundsInput, padding?: number): void;
  getBounds(): LatLngBounds | undefined;
  getDiv(): HTMLElement;
};

type DataFeature = {
  getGeometry(): { forEachLatLng(callback: (point: unknown) => void): void } | null;
};

type DataLayer = {
  addGeoJson(data: GeoJson): DataFeature[];
  setMap(map: GoogleMap | null): void;
  setStyle(style: Record<string, unknown>): void;
};

type MapConstructor = {
  new (...args: any[]): GoogleMap;
  prototype: GoogleMap;
};

type MapsApi = {
  Map: MapConstructor;
  Data: new (options: { map: GoogleMap }) => DataLayer;
  LatLngBounds: new (bounds?: BoundsInput) => LatLngBounds;
  SymbolPath: { CIRCLE: unknown };
};

const pageWindow = unsafeWindow as typeof window & {
  google?: { maps?: MapsApi };
};

const maps: GoogleMap[] = [];
const fittedBounds = new WeakMap<GoogleMap, BoundsInput>();
const wrappedFitBounds = new WeakSet<GoogleMap['fitBounds']>();
const wrappedMapConstructors = new WeakSet<MapConstructor>();
let pendingGeoJson: GeoJson | null = null;
let layer: DataLayer | null = null;
let layerMap: GoogleMap | null = null;
let layerBounds: BoundsInput | null = null;
let renderObserver: MutationObserver | null = null;
let fittingArea = false;

function detachLayer() {
  layer?.setMap(null);
  layer = null;
  layerMap = null;
  layerBounds = null;
}

function stopWatchingForResultMap() {
  renderObserver?.disconnect();
  renderObserver = null;
}

function isVisibleMap(map: GoogleMap) {
  try {
    const element = map.getDiv();
    return element.isConnected && element.getClientRects().length > 0;
  } catch {
    return false;
  }
}

function mapFromReact(element: Element | null) {
  if (!element) return null;
  // GeoGuessr does not expose its result-map instance, so read it from React as a fallback.
  const key = Object.keys(element).find((name) => name.startsWith('__reactFiber'));
  const fiber = key ? (element as Record<string, any>)[key] : null;
  const map =
    fiber?.return?.memoizedState?.memoizedState?.current?.instance ??
    fiber?.return?.updateQueue?.lastEffect?.deps?.[0];
  return map &&
    typeof map.fitBounds === 'function' &&
    typeof map.getBounds === 'function' &&
    typeof map.getDiv === 'function'
    ? (map as GoogleMap)
    : null;
}

function currentResultMap() {
  const visibleMaps = maps.filter(isVisibleMap);
  const resultView = pageWindow.document.querySelector('div[data-qa="result-view-top"]');
  if (resultView) {
    const reactMap = mapFromReact(resultView.querySelector('[class*="coordinate-result-map_map"]'));
    if (reactMap && isVisibleMap(reactMap)) {
      wrapFitBounds(reactMap);
      if (!maps.includes(reactMap)) maps.push(reactMap);
      return reactMap;
    }
    return visibleMaps.findLast((map) => resultView.contains(map.getDiv())) ?? null;
  }
  return visibleMaps.at(-1) ?? null;
}

function watchForResultMap() {
  if (renderObserver) return;
  renderObserver = new MutationObserver(renderPendingArea);
  renderObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

function wrapFitBounds(map: GoogleMap) {
  const originalFitBounds = map.fitBounds;
  if (wrappedFitBounds.has(originalFitBounds)) return;

  const fitBounds: GoogleMap['fitBounds'] = function (this: GoogleMap, ...args) {
    const result = originalFitBounds.apply(this, args);
    if (!fittingArea) {
      fittedBounds.set(this, args[0]);
      if (pendingGeoJson && layerMap === this) detachLayer();
    }
    trackMap(this);
    return result;
  };
  wrappedFitBounds.add(fitBounds);
  map.fitBounds = fitBounds;
}

function trackMap(map: GoogleMap) {
  if (!maps.includes(map)) maps.push(map);
  if (!pendingGeoJson) return;
  watchForResultMap();
  queueMicrotask(renderPendingArea);
  requestAnimationFrame(renderPendingArea);
}

function renderPendingArea() {
  if (!pendingGeoJson) return;
  const map = currentResultMap();
  const mapsApi = pageWindow.google?.maps;
  if (!map || !mapsApi?.Data || !mapsApi.LatLngBounds || !mapsApi.SymbolPath) return;
  if (layerMap === map) return;
  detachLayer();
  const currentBounds = fittedBounds.get(map) ?? map.getBounds();
  if (!currentBounds) return;

  const nextLayer = new mapsApi.Data({ map });
  try {
    nextLayer.setStyle({
      clickable: false,
      fillColor: '#057a55',
      fillOpacity: 0.16,
      strokeColor: '#057a55',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      icon: {
        path: mapsApi.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: '#057a55',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });
    const features = nextLayer.addGeoJson(pendingGeoJson);
    const bounds = new mapsApi.LatLngBounds(currentBounds);
    features.forEach((feature) =>
      feature.getGeometry()?.forEachLatLng((point) => bounds.extend(point))
    );
    fittingArea = true;
    try {
      map.fitBounds(bounds, 48);
    } finally {
      fittingArea = false;
    }
    layer = nextLayer;
    layerMap = map;
    layerBounds = currentBounds;
    stopWatchingForResultMap();
  } catch (error) {
    nextLayer.setMap(null);
    stopWatchingForResultMap();
    console.error('ALM: failed to render map area', error);
  }
}

function wrapGoogleMaps() {
  const mapsApi = pageWindow.google?.maps;
  const OriginalMap = mapsApi?.Map;
  if (!mapsApi || !OriginalMap) return false;

  wrapFitBounds(OriginalMap.prototype);

  if (wrappedMapConstructors.has(OriginalMap)) return true;

  const WrappedMap = class extends OriginalMap {
    constructor(...args: any[]) {
      super(...args);
      trackMap(this);
    }
  };
  wrappedMapConstructors.add(WrappedMap);
  mapsApi.Map = WrappedMap;
  return true;
}

function interceptGoogleCallback(script: HTMLScriptElement) {
  const path = new URL(script.src).searchParams.get('callback')?.split('.');
  if (!path?.length) return;

  let owner = pageWindow as Record<string, any>;
  for (const part of path.slice(0, -1)) {
    owner = owner?.[part];
    if (!owner) return;
  }
  const name = path.at(-1)!;
  const original = owner[name];
  if (typeof original !== 'function') return;
  owner[name] = function (...args: any[]) {
    wrapGoogleMaps();
    return original.apply(this, args);
  };
}

function interceptGoogleScript(script: HTMLScriptElement) {
  if (!script.src.includes('maps.googleapis.com') || script.dataset.geometaObserved) return;
  script.dataset.geometaObserved = 'true';
  interceptGoogleCallback(script);
  script.addEventListener('load', wrapGoogleMaps, { once: true });
}

export function initMapArea() {
  if (wrapGoogleMaps()) return;

  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach(interceptGoogleScript);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLScriptElement) interceptGoogleScript(node);
      }
    }
    if (wrapGoogleMaps()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
}

export function showMapArea(geoJson: unknown) {
  clearMapArea();
  if (!geoJson || typeof geoJson !== 'object' || Array.isArray(geoJson)) return;
  pendingGeoJson = geoJson as GeoJson;
  watchForResultMap();
  renderPendingArea();
}

export function clearMapArea() {
  pendingGeoJson = null;
  stopWatchingForResultMap();
  const map = layerMap;
  const bounds = layerBounds;
  detachLayer();
  if (map && bounds) {
    fittingArea = true;
    try {
      map.fitBounds(bounds);
    } finally {
      fittingArea = false;
    }
  }
}
