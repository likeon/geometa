import { GM_xmlhttpRequest, unsafeWindow } from '$';
import { readonly, writable } from 'svelte/store';

const MANIFEST_URL = 'https://userscript.learnablemeta.com/manifest.json';
const CACHE_KEY = 'geometa:release-manifest';
const CACHE_MS = 10 * 60 * 1000;

type VersionCache = {
  version: string;
  fetchedAt: number;
};

function isVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d+(?:\.\d+)*$/.test(value) &&
    value.split('.').every((part) => Number.isSafeInteger(Number(part)))
  );
}

function readCache(): VersionCache | null {
  try {
    const saved = unsafeWindow.localStorage.getItem(CACHE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (
      isVersion(parsed?.version) &&
      Number.isFinite(parsed.fetchedAt) &&
      parsed.fetchedAt >= 0 &&
      parsed.fetchedAt <= Date.now()
    ) {
      return { version: parsed.version, fetchedAt: parsed.fetchedAt };
    }
  } catch {
    // Invalid cache or blocked storage; fetch manifest instead.
  }
  return null;
}

let cache = readCache();
const version = writable<string | null>(cache?.version ?? null);
export const latestVersion = readonly(version);
let pending: Promise<void> | null = null;

function fetchVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: MANIFEST_URL,
      anonymous: true,
      timeout: 10000,
      onload: (response) => {
        if (response.status !== 200) {
          reject(new Error(`Manifest HTTP error: ${response.status}`));
          return;
        }
        try {
          const manifest = JSON.parse(response.responseText);
          if (!isVersion(manifest?.version)) throw new Error('Invalid manifest version');
          resolve(manifest.version);
        } catch (error) {
          reject(error);
        }
      },
      onerror: () => reject(new Error('Failed to fetch userscript manifest')),
      ontimeout: () => reject(new Error('Userscript manifest request timed out')),
      onabort: () => reject(new Error('Userscript manifest request aborted'))
    });
  });
}

export function refreshLatestVersion(): Promise<void> {
  if (pending) return pending;
  const age = cache ? Date.now() - cache.fetchedAt : Infinity;
  if (age >= 0 && age < CACHE_MS) return Promise.resolve();

  pending = fetchVersion()
    .then((latest) => {
      cache = { version: latest, fetchedAt: Date.now() };
      version.set(latest);
      try {
        unsafeWindow.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch {
        // Keep in-memory cache when storage blocked.
      }
    })
    .catch((error) => {
      // Version check must never block gameplay. Keep last valid manifest version.
      console.warn('ALM: failed to check userscript version', error);
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  if (!isVersion(candidate) || !isVersion(current)) return false;
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff > 0;
  }
  return false;
}
