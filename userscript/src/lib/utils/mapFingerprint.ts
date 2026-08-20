export type ManagedMapCoordinate = {
  panoId: string | null;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
};

export function canonicalizeMapCoordinates(coordinates: ManagedMapCoordinate[]): string {
  const tuples = coordinates.map(
    ({ panoId, lat, lng, heading, pitch, zoom }) =>
      [panoId, lat, lng, heading, pitch, zoom] as const
  );
  tuples.sort((left, right) => {
    const leftJson = JSON.stringify(left);
    const rightJson = JSON.stringify(right);
    return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
  });
  return JSON.stringify(tuples);
}

export async function fingerprintMapCoordinates(
  coordinates: ManagedMapCoordinate[]
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeMapCoordinates(coordinates));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
