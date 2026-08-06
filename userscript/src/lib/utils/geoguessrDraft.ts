import type { ManagedMapCoordinate } from './mapFingerprint';

export type GeoGuessrDraftCoordinates = {
  coordinates?: ManagedMapCoordinate[];
  // Compatibility fallback in case GeoGuessr changes the draft response to
  // match the customCoordinates field accepted by its update endpoint.
  customCoordinates?: ManagedMapCoordinate[];
};

export function getGeoguessrDraftCoordinates(
  draft: GeoGuessrDraftCoordinates
): ManagedMapCoordinate[] {
  if (Array.isArray(draft.coordinates)) return draft.coordinates;
  if (Array.isArray(draft.customCoordinates)) return draft.customCoordinates;
  return [];
}
