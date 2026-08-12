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

const point = { type: 'Point', coordinates: [10.5, 20.5] };

describe('normalizeGeoJson', () => {
  test('normalizes supported roots and counts polygon features', () => {
    const normalized = normalizeGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'marker' }, geometry: point },
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'MultiPoint',
            coordinates: [point.coordinates, [11.5, 21.5]],
          },
        },
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
    expect(normalized.features[0].properties).toEqual({ name: 'marker' });
    expect(summarizeGeoJson(normalized)).toEqual({
      featureCount: 4,
      polygonCount: 3,
    });
    expect(normalizeGeoJson(polygon).features).toHaveLength(1);
    expect(normalizeGeoJson(point).features[0].geometry.type).toBe('Point');
  });

  test.each([
    [{ type: 'FeatureCollection', features: [] }, 'at least one feature'],
    [
      { type: 'LineString', coordinates: [] },
      'Only Point, MultiPoint, Polygon',
    ],
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
      'Longitude',
    ],
  ])('rejects invalid area data', (input, message) => {
    expect(() => normalizeGeoJson(input)).toThrow(message as string);
  });
});
