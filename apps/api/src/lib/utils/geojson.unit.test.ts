import { describe, expect, test } from 'bun:test';
import { normalizeGeoJson, summarizeGeoJson } from './geojson';

const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [10, 20],
      [11, 20],
      [11, 21],
      [10, 20],
    ],
  ],
};

describe('normalizeGeoJson', () => {
  test('normalizes supported roots and summarizes Polygon/MultiPolygon features', () => {
    const normalized = normalizeGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'one' }, geometry: polygon },
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [polygon.coordinates, polygon.coordinates],
          },
        },
      ],
    });

    expect(normalized.type).toBe('FeatureCollection');
    expect(normalized.features[0].properties).toEqual({ name: 'one' });
    expect(summarizeGeoJson(normalized)).toEqual({
      featureCount: 2,
      polygonCount: 3,
    });
    expect(normalizeGeoJson(polygon).features).toHaveLength(1);
  });

  test.each([
    [{ type: 'FeatureCollection', features: [] }, 'at least one feature'],
    [{ type: 'LineString', coordinates: [] }, 'Only Polygon and MultiPolygon'],
    [
      {
        type: 'Polygon',
        coordinates: [
          [
            [10, 20],
            [11, 20],
            [11, 21],
            [10, 21],
          ],
        ],
      },
      'must be closed',
    ],
    [
      {
        type: 'Polygon',
        coordinates: [
          [
            [181, 20],
            [11, 20],
            [11, 21],
            [181, 20],
          ],
        ],
      },
      'WGS84',
    ],
  ])('rejects invalid area data', (input, message) => {
    expect(() => normalizeGeoJson(input)).toThrow(message as string);
  });
});
