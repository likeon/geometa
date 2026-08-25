import { GM_getValue, GM_setValue } from '$';

const STORAGE_KEY = 'learnableMeta_geoJsonEnabled';

export function isGeoJsonEnabled() {
  return GM_getValue(STORAGE_KEY, true);
}

export function setGeoJsonEnabled(enabled: boolean) {
  GM_setValue(STORAGE_KEY, enabled);
}
