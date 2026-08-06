import { describe, expect, test } from 'bun:test';
import {
  canonicalizeMapCoordinates,
  fingerprintMapCoordinates
} from '../src/lib/utils/mapFingerprint';

const coordinates = [
  { panoId: 'pano-a', lat: 1, lng: 2, heading: 3, pitch: 4, zoom: 5 },
  { panoId: 'pano-b', lat: 6, lng: 7, heading: 8, pitch: 9, zoom: 10 }
];

describe('userscript map fingerprint', () => {
  test('matches the API canonical test vector regardless of order', async () => {
    expect(canonicalizeMapCoordinates([...coordinates].reverse())).toBe(
      '[["pano-a",1,2,3,4,5],["pano-b",6,7,8,9,10]]'
    );
    expect(await fingerprintMapCoordinates([...coordinates].reverse())).toBe(
      '4a2121be5c5e4a594afa0a8bea69118650531865e779f5f338671b0423cf126f'
    );
  });

  test.each(['panoId', 'lat', 'lng', 'heading', 'pitch', 'zoom'] as const)(
    'detects a change to %s',
    async (field) => {
      const changed = coordinates.map((coordinate) => ({ ...coordinate }));
      changed[0] = {
        ...changed[0],
        [field]: field === 'panoId' ? 'different' : changed[0][field] + 0.5
      };
      expect(await fingerprintMapCoordinates(changed)).not.toBe(
        await fingerprintMapCoordinates(coordinates)
      );
    }
  );
});
