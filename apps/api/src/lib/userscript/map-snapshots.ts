import { maps, syncedLocations, syncedMapMetas } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';
import { eq, inArray } from 'drizzle-orm';
import { fingerprintMapCoordinates } from './map-fingerprint';

export async function getSynchronizedGroupMapSnapshots(groupId: number) {
  const groupMaps = await db.$primary.query.maps.findMany({
    where: eq(maps.mapGroupId, groupId),
    columns: { id: true, name: true, geoguessrId: true },
    orderBy: (map, { asc }) => [asc(map.name), asc(map.id)],
  });
  const locationsByMapId = new Map<
    number,
    {
      panoId: string | null;
      lat: number;
      lng: number;
      heading: number;
      pitch: number;
      zoom: number;
    }[]
  >();

  if (groupMaps.length !== 0) {
    const locationRows = await db.$primary
      .select({
        mapId: syncedMapMetas.mapId,
        panoId: syncedLocations.panoId,
        lat: syncedLocations.lat,
        lng: syncedLocations.lng,
        heading: syncedLocations.heading,
        pitch: syncedLocations.pitch,
        zoom: syncedLocations.zoom,
      })
      .from(syncedMapMetas)
      .innerJoin(
        syncedLocations,
        eq(syncedLocations.syncedMetaId, syncedMapMetas.syncedMetaId),
      )
      .where(
        inArray(
          syncedMapMetas.mapId,
          groupMaps.map((map) => map.id),
        ),
      );

    for (const row of locationRows) {
      const locations = locationsByMapId.get(row.mapId) ?? [];
      locations.push(row);
      locationsByMapId.set(row.mapId, locations);
    }
  }

  return groupMaps.map((map) => {
    const locations = locationsByMapId.get(map.id) ?? [];
    return {
      mapId: map.id,
      name: map.name,
      geoguessrId: map.geoguessrId,
      locationCount: locations.length,
      fingerprint: fingerprintMapCoordinates(locations),
    };
  });
}

export function countPublishableMapLocationChanges(
  before: Awaited<ReturnType<typeof getSynchronizedGroupMapSnapshots>>,
  after: Awaited<ReturnType<typeof getSynchronizedGroupMapSnapshots>>,
) {
  const oldFingerprintByMapId = new Map(
    before.map((map) => [map.mapId, map.fingerprint]),
  );
  return after.filter(
    (map) =>
      map.locationCount > 0 &&
      oldFingerprintByMapId.get(map.mapId) !== map.fingerprint,
  ).length;
}
