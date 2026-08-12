export const MAX_GEOJSON_BYTES = 5 * 1024 * 1024;

type Position = [number, number, ...number[]];

export type MetaGeoJsonGeometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'MultiPoint'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export type MetaGeoJsonFeature = {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: MetaGeoJsonGeometry;
  id?: string | number;
};

export type MetaGeoJson = {
  type: 'FeatureCollection';
  features: MetaGeoJsonFeature[];
};

export class GeoJsonValidationError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeoJsonValidationError('GeoJSON must be an object');
  }
  return value as Record<string, unknown>;
}

function position(value: unknown): Position {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.some(
      (coordinate) =>
        typeof coordinate !== 'number' || !Number.isFinite(coordinate),
    )
  ) {
    throw new GeoJsonValidationError(
      'Positions must contain at least two finite numbers',
    );
  }
  if (value[0] < -180 || value[0] > 180 || value[1] < -90 || value[1] > 90) {
    throw new GeoJsonValidationError(
      'Longitude must be between -180 and 180 and latitude between -90 and 90',
    );
  }
  return value as Position;
}

function multiPoint(value: unknown): Position[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new GeoJsonValidationError(
      'MultiPoint geometries must contain at least one position',
    );
  }
  return value.map(position);
}

function ring(value: unknown): Position[] {
  if (!Array.isArray(value) || value.length < 4) {
    throw new GeoJsonValidationError(
      'Polygon rings must contain at least four positions',
    );
  }
  const positions = value.map(position);
  const first = positions[0];
  const last = positions.at(-1)!;
  if (
    first.length !== last.length ||
    first.some((coordinate, index) => coordinate !== last[index])
  ) {
    throw new GeoJsonValidationError('Polygon rings must be closed');
  }
  return positions;
}

function polygon(value: unknown): Position[][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new GeoJsonValidationError('Polygons must contain at least one ring');
  }
  return value.map(ring);
}

function geometry(value: unknown): MetaGeoJsonGeometry {
  const input = record(value);
  switch (input.type) {
    case 'Point':
      return { type: 'Point', coordinates: position(input.coordinates) };
    case 'MultiPoint':
      return { type: 'MultiPoint', coordinates: multiPoint(input.coordinates) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: polygon(input.coordinates) };
    case 'MultiPolygon':
      if (!Array.isArray(input.coordinates) || input.coordinates.length === 0) {
        throw new GeoJsonValidationError(
          'MultiPolygons must contain at least one polygon',
        );
      }
      return {
        type: 'MultiPolygon',
        coordinates: input.coordinates.map(polygon),
      };
    default:
      throw new GeoJsonValidationError(
        'Only Point, MultiPoint, Polygon, and MultiPolygon geometries are supported',
      );
  }
}

function feature(value: unknown): MetaGeoJsonFeature {
  const input = record(value);
  if (input.type !== 'Feature') {
    throw new GeoJsonValidationError(
      'FeatureCollection entries must be Features',
    );
  }
  const properties = input.properties ?? null;
  if (
    properties !== null &&
    (typeof properties !== 'object' || Array.isArray(properties))
  ) {
    throw new GeoJsonValidationError(
      'GeoJSON feature properties must be an object or null',
    );
  }
  if (
    input.id !== undefined &&
    typeof input.id !== 'string' &&
    typeof input.id !== 'number'
  ) {
    throw new GeoJsonValidationError(
      'GeoJSON feature ids must be strings or numbers',
    );
  }
  return {
    type: 'Feature',
    properties: properties as Record<string, unknown> | null,
    geometry: geometry(input.geometry),
    ...(input.id === undefined ? {} : { id: input.id }),
  };
}

export function normalizeGeoJson(value: unknown): MetaGeoJson {
  const input = record(value);
  let features: MetaGeoJsonFeature[];
  if (input.type === 'FeatureCollection') {
    if (!Array.isArray(input.features) || input.features.length === 0) {
      throw new GeoJsonValidationError(
        'GeoJSON must contain at least one feature',
      );
    }
    features = input.features.map(feature);
  } else if (input.type === 'Feature') {
    features = [feature(input)];
  } else {
    features = [
      {
        type: 'Feature',
        properties: null,
        geometry: geometry(input),
      },
    ];
  }
  return { type: 'FeatureCollection', features };
}

export function summarizeGeoJson(geoJson: MetaGeoJson) {
  return {
    featureCount: geoJson.features.length,
    polygonCount: geoJson.features.reduce(
      (count, item) =>
        count +
        (item.geometry.type === 'Polygon'
          ? 1
          : item.geometry.type === 'MultiPolygon'
            ? item.geometry.coordinates.length
            : 0),
      0,
    ),
  };
}
