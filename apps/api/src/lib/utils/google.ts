import retry from 'async-retry';

type StreetViewMeta = {
  status: string;
  pano_id?: string;
  date?: string;
  location?: { lat: number; lng: number };
  copyright?: string;
};

export async function streetViewFromPanoid(panoId: string) {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/streetview/metadata',
  );
  url.searchParams.set('pano', panoId);
  url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY!);

  const meta = await retry<StreetViewMeta>(
    async (bail) => {
      const res = await fetch(url.toString());

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw bail(new Error(`HTTP ${res.status}`));
        }
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as StreetViewMeta;
    },
    { retries: 3 },
  );

  if (meta.status !== 'OK' || !meta.location) {
    return null;
  }

  const copyright = meta.copyright ?? '';
  const isOfficialCoverage =
    /©?\s*\d{4}?\s*Google/i.test(copyright) || /©?\s*Google/i.test(copyright);

  return {
    panoId: meta.pano_id!,
    lat: meta.location.lat,
    lng: meta.location.lng,
    date: meta.date ?? null,
    isOfficialCoverage,
  };
}
