import { describe, expect, test } from 'bun:test';
import { getGeoguessrDraftCoordinates } from '../src/lib/utils/geoguessrDraft';

const coordinates = [
  { panoId: 'pano-a', lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5 }
];

describe('GeoGuessr draft coordinates', () => {
  test('reads coordinates from the field returned by the draft endpoint', () => {
    expect(getGeoguessrDraftCoordinates({ coordinates })).toBe(coordinates);
  });

  test('supports the customCoordinates response shape as a fallback', () => {
    expect(getGeoguessrDraftCoordinates({ customCoordinates: coordinates })).toBe(coordinates);
  });

  test('prefers the current coordinates field and safely handles a missing field', () => {
    expect(
      getGeoguessrDraftCoordinates({ coordinates, customCoordinates: [] })
    ).toBe(coordinates);
    expect(getGeoguessrDraftCoordinates({})).toEqual([]);
  });
});
