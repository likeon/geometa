import { describe, expect, test } from 'bun:test';
import {
  canonicalizeMapCoordinates,
  fingerprintMapCoordinates,
  type ManagedMapCoordinate,
} from './map-fingerprint';

const first: ManagedMapCoordinate = {
  panoId: 'pano-a',
  lat: 1,
  lng: 2,
  heading: 3,
  pitch: 4,
  zoom: 5,
};
const second: ManagedMapCoordinate = {
  panoId: 'pano-b',
  lat: 6,
  lng: 7,
  heading: 8,
  pitch: 9,
  zoom: 10,
};

describe('map coordinate fingerprint', () => {
  test('is independent of coordinate order', () => {
    expect(fingerprintMapCoordinates([first, second])).toBe(
      fingerprintMapCoordinates([second, first]),
    );
  });

  test.each([
    'panoId',
    'lat',
    'lng',
    'heading',
    'pitch',
    'zoom',
  ] as const)('changes when %s changes', (field) => {
    const changed = {
      ...first,
      [field]: field === 'panoId' ? 'different' : first[field] + 0.5,
    };
    expect(fingerprintMapCoordinates([changed])).not.toBe(
      fingerprintMapCoordinates([first]),
    );
  });

  test('has a stable canonical test vector for the userscript', () => {
    expect(canonicalizeMapCoordinates([second, first])).toBe(
      '[["pano-a",1,2,3,4,5],["pano-b",6,7,8,9,10]]',
    );
    expect(fingerprintMapCoordinates([second, first])).toBe(
      '4a2121be5c5e4a594afa0a8bea69118650531865e779f5f338671b0423cf126f',
    );
  });
});
