const LIVE_CHALLENGE_PATH = /^\/(?:api\/)?live-challenge\/([^/?#]+)\/?$/;
const PARTY_LOBBY_PATH = /^\/party\/lobby\/[^/?#]+\/?$/;

type TrackedChallenge = {
  id: string;
  partyLobbyPath: string;
};

let trackedPartyChallenge: TrackedChallenge | null = null;
let resourceObserver: PerformanceObserver | null = null;

function pathnameFromUrl(url: string): string | null {
  try {
    return new URL(url, 'https://www.geoguessr.com').pathname;
  } catch {
    return null;
  }
}

export function extractLiveChallengeId(url: string): string | null {
  const pathname = pathnameFromUrl(url);
  return pathname?.match(LIVE_CHALLENGE_PATH)?.[1] ?? null;
}

export function isPartyLobbyPath(pathname: string): boolean {
  return PARTY_LOBBY_PATH.test(pathname);
}

export function findPartyLiveChallengeId(
  pathname: string,
  resourceUrls: readonly string[],
  trackedChallenge: TrackedChallenge | null = null
): string | null {
  if (!isPartyLobbyPath(pathname)) {
    return null;
  }

  for (let i = resourceUrls.length - 1; i >= 0; i--) {
    const id = extractLiveChallengeId(resourceUrls[i]);
    if (id) {
      return id;
    }
  }

  return trackedChallenge?.partyLobbyPath === pathname ? trackedChallenge.id : null;
}

function trackResource(url: string) {
  if (!isPartyLobbyPath(location.pathname)) {
    return;
  }

  const id = extractLiveChallengeId(url);
  if (id) {
    trackedPartyChallenge = { id, partyLobbyPath: location.pathname };
  }
}

/**
 * Remembers live-challenge API requests made while GeoGuessr keeps the browser
 * on a /party/lobby/... URL. This observes request URLs only; response bodies
 * and party access tokens are never read.
 */
export function initLiveChallengeIdTracking() {
  if (resourceObserver || typeof PerformanceObserver === 'undefined') {
    return;
  }

  for (const entry of performance.getEntriesByType('resource')) {
    trackResource(entry.name);
  }

  resourceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      trackResource(entry.name);
    }
  });
  resourceObserver.observe({ entryTypes: ['resource'] });
}

export function getLiveChallengeId(pathname: string = location.pathname): string | null {
  const routeId = extractLiveChallengeId(pathname);
  if (routeId) {
    return routeId;
  }

  if (!isPartyLobbyPath(pathname)) {
    return null;
  }

  return findPartyLiveChallengeId(
    pathname,
    performance.getEntriesByType('resource').map((entry) => entry.name),
    trackedPartyChallenge
  );
}
