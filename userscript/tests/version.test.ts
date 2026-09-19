import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';

const { request, storage } = vi.hoisted(() => ({
  request: vi.fn(),
  storage: { getItem: vi.fn(), setItem: vi.fn() }
}));
vi.mock('$', () => ({ GM_xmlhttpRequest: request, unsafeWindow: { localStorage: storage } }));

const CACHE_KEY = 'geometa:release-manifest';
const TEN_MINUTES = 10 * 60 * 1000;

type RequestOptions = {
  onload: (response: { status: number; responseText: string }) => void;
  onerror: () => void;
  ontimeout: () => void;
  onabort: () => void;
};

function respond(body: unknown, status = 200) {
  const options = request.mock.lastCall![0] as RequestOptions;
  options.onload({ status, responseText: JSON.stringify(body) });
}

function savedVersion(version: string, age: number) {
  storage.getItem.mockReturnValue(JSON.stringify({ version, fetchedAt: Date.now() - age }));
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-09T12:00:00Z'));
  storage.getItem.mockReturnValue(null);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('fetches Pages manifest without credentials and notifies subscribers', async () => {
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  const seen: (string | null)[] = [];
  const unsubscribe = latestVersion.subscribe((version) => seen.push(version));
  const pending = refreshLatestVersion();

  expect(get(latestVersion)).toBeNull();
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      method: 'GET',
      url: 'https://userscript.learnablemeta.com/manifest.json',
      anonymous: true,
      timeout: 10000
    })
  );
  respond({ version: '0.97', commit: 'a'.repeat(40) });
  await pending;

  expect(seen).toEqual([null, '0.97']);
  expect(storage.setItem).toHaveBeenCalledWith(
    CACHE_KEY,
    JSON.stringify({ version: '0.97', fetchedAt: Date.now() })
  );
  unsubscribe();
});

test('shares in-flight request and caches success for exactly ten minutes', async () => {
  const { refreshLatestVersion } = await import('../src/lib/utils/version');
  const pending = refreshLatestVersion();
  expect(refreshLatestVersion()).toBe(pending);
  expect(request).toHaveBeenCalledTimes(1);
  respond({ version: '0.97' });
  await pending;

  vi.advanceTimersByTime(TEN_MINUTES - 1);
  await refreshLatestVersion();
  expect(request).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(1);
  const next = refreshLatestVersion();
  expect(request).toHaveBeenCalledTimes(2);
  respond({ version: '0.98' });
  await next;
});

test('reuses fresh persisted version after reload', async () => {
  savedVersion('0.97', TEN_MINUTES - 1);
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  await refreshLatestVersion();
  expect(get(latestVersion)).toBe('0.97');
  expect(request).not.toHaveBeenCalled();
});

test('keeps stale manifest version visible until refresh completes', async () => {
  savedVersion('0.97', TEN_MINUTES);
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  const pending = refreshLatestVersion();
  expect(get(latestVersion)).toBe('0.97');
  respond({ version: '0.98' });
  await pending;
  expect(get(latestVersion)).toBe('0.98');
});

test('ignores legacy API version cache', async () => {
  storage.getItem.mockImplementation((key) => (key === 'geometa:latest-version' ? '99.0' : null));
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  expect(get(latestVersion)).toBeNull();
  expect(storage.getItem).toHaveBeenCalledWith(CACHE_KEY);
  const pending = refreshLatestVersion();
  respond({ version: '0.97' });
  await pending;
  expect(get(latestVersion)).toBe('0.97');
});

test.each(['invalid JSON', 'null', '{}', '{"version":"undefined","fetchedAt":0}'])(
  'ignores invalid stored cache: %s',
  async (cache) => {
    storage.getItem.mockReturnValue(cache);
    const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
    expect(get(latestVersion)).toBeNull();
    const pending = refreshLatestVersion();
    respond({ version: '0.97' });
    await pending;
    expect(get(latestVersion)).toBe('0.97');
  }
);

test.each([-1, '123', null, 'future'])('ignores invalid cache timestamp: %s', async (timestamp) => {
  storage.getItem.mockReturnValue(
    JSON.stringify({
      version: '0.97',
      fetchedAt: timestamp === 'future' ? Date.now() + 1 : timestamp
    })
  );
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  expect(get(latestVersion)).toBeNull();
  const pending = refreshLatestVersion();
  respond({ version: '0.98' });
  await pending;
  expect(request).toHaveBeenCalledTimes(1);
});

test.each([
  null,
  {},
  { version: 0.97 },
  { version: '' },
  { version: 'v0.97' },
  { version: '0..97' }
])('rejects invalid manifest: %j', async (manifest) => {
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  const pending = refreshLatestVersion();
  respond(manifest);
  await expect(pending).resolves.toBeUndefined();
  expect(get(latestVersion)).toBeNull();
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('handles invalid manifest JSON without unhandled rejection', async () => {
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  const pending = refreshLatestVersion();
  const options = request.mock.lastCall![0] as RequestOptions;
  options.onload({ status: 200, responseText: '<html>Not JSON</html>' });
  await expect(pending).resolves.toBeUndefined();
  expect(get(latestVersion)).toBeNull();
  expect(storage.setItem).not.toHaveBeenCalled();
});

test.each(['HTTP', 'onerror', 'ontimeout', 'onabort', 'invalid version'] as const)(
  'keeps stale cache on %s failure and allows retry',
  async (failure) => {
    savedVersion('0.97', TEN_MINUTES);
    const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
    const pending = refreshLatestVersion();
    if (failure === 'HTTP') respond({ version: '0.98' }, 503);
    else if (failure === 'invalid version') respond({ version: 'invalid' });
    else (request.mock.lastCall![0] as RequestOptions)[failure]();
    await expect(pending).resolves.toBeUndefined();
    expect(get(latestVersion)).toBe('0.97');
    expect(storage.setItem).not.toHaveBeenCalled();

    const retry = refreshLatestVersion();
    expect(request).toHaveBeenCalledTimes(2);
    respond({ version: '0.98' });
    await retry;
    expect(get(latestVersion)).toBe('0.98');
  }
);

test('handles synchronous request errors without unhandled rejection', async () => {
  request.mockImplementation(() => {
    throw new Error('Request denied');
  });
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  await expect(refreshLatestVersion()).resolves.toBeUndefined();
  expect(get(latestVersion)).toBeNull();
});

test('uses memory cache when localStorage is blocked', async () => {
  storage.getItem.mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  storage.setItem.mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  const { latestVersion, refreshLatestVersion } = await import('../src/lib/utils/version');
  const pending = refreshLatestVersion();
  respond({ version: '0.97' });
  await pending;
  expect(get(latestVersion)).toBe('0.97');
  await refreshLatestVersion();
  expect(request).toHaveBeenCalledTimes(1);
});

test.each([
  ['0.97', '0.96', true],
  ['0.100', '0.99', true],
  ['1.0', '0.99', true],
  ['0.96.1', '0.96', true],
  ['0.96', '0.96', false],
  ['0.96.0', '0.96', false],
  ['0.96', '0.97', false],
  ['invalid', '0.96', false],
  ['0.97', 'invalid', false]
])('compares %s against installed %s', async (candidate, current, expected) => {
  const { isNewerVersion } = await import('../src/lib/utils/version');
  expect(isNewerVersion(candidate, current)).toBe(expected);
});
