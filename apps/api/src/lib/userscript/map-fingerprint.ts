import { createHash } from 'node:crypto';

export type ManagedMapCoordinate = {
  panoId: string | null;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
};

export function canonicalizeMapCoordinates(
  coordinates: ManagedMapCoordinate[],
): string {
  const tuples = coordinates.map(
    ({ panoId, lat, lng, heading, pitch, zoom }) =>
      [panoId, lat, lng, heading, pitch, zoom] as const,
  );
  tuples.sort((left, right) => {
    const leftJson = JSON.stringify(left);
    const rightJson = JSON.stringify(right);
    return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
  });
  return JSON.stringify(tuples);
}

export function fingerprintMapCoordinates(
  coordinates: ManagedMapCoordinate[],
): string {
  return createHash('sha256')
    .update(canonicalizeMapCoordinates(coordinates))
    .digest('hex');
}
