import { unsafeWindow } from '$';

type GeoJson = Record<string, unknown>;

type GoogleMap = {
  getDiv(): HTMLElement;
};

type DataLayer = {
  addGeoJson(data: GeoJson): unknown[];
  setMap(map: GoogleMap | null): void;
  setStyle(style: Record<string, unknown>): void;
};

type MapConstructor = {
  new (...args: any[]): GoogleMap;
  geometaWrapped?: boolean;
};

type MapsApi = {
  Map: MapConstructor;
  Data: new (options: { map: GoogleMap }) => DataLayer;
};

const pageWindow = unsafeWindow as typeof window & {
  google?: { maps?: MapsApi };
};

let maps: GoogleMap[] = [];
let pendingGeoJson: GeoJson | null = null;
let layer: DataLayer | null = null;

function detachLayer() {
  layer?.setMap(null);
  layer = null;
}

function currentResultMap() {
  maps = maps.filter((map) => {
    try {
      const element = map.getDiv();
      return element.isConnected && element.getClientRects().length > 0;
    } catch {
      return false;
    }
  });
  const resultView = document.querySelector('div[data-qa="result-view-top"]');
  return maps.findLast((map) => resultView?.contains(map.getDiv())) ?? maps.at(-1) ?? null;
}

function renderPendingArea() {
  if (!pendingGeoJson || layer) return;
  const map = currentResultMap();
  const Data = pageWindow.google?.maps?.Data;
  if (!map || !Data) return;

  const nextLayer = new Data({ map });
  try {
    nextLayer.setStyle({
      clickable: false,
      fillColor: '#7c3aed',
      fillOpacity: 0.18,
      strokeColor: '#7c3aed',
      strokeOpacity: 0.9,
      strokeWeight: 2
    });
    nextLayer.addGeoJson(pendingGeoJson);
    layer = nextLayer;
  } catch (error) {
    nextLayer.setMap(null);
    console.error('ALM: failed to render map area', error);
  }
}

function wrapGoogleMaps() {
  const mapsApi = pageWindow.google?.maps;
  const OriginalMap = mapsApi?.Map;
  if (!mapsApi || !OriginalMap || OriginalMap.geometaWrapped) return Boolean(OriginalMap);

  const WrappedMap = class extends OriginalMap {
    constructor(...args: any[]) {
      super(...args);
      maps.push(this);
      if (pendingGeoJson) detachLayer();
      queueMicrotask(renderPendingArea);
      requestAnimationFrame(renderPendingArea);
    }
  };
  WrappedMap.geometaWrapped = true;
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
  const originalOnload = script.onload;
  script.onload = function (event) {
    wrapGoogleMaps();
    return originalOnload?.call(this, event);
  };
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
  renderPendingArea();
}

export function clearMapArea() {
  pendingGeoJson = null;
  detachLayer();
}
