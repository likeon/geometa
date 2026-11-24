import { describe, expect, test, vi } from 'vitest';
import { CREATE_MAP_BUTTON_SELECTOR } from '../src/lib/mapGroupUpdate';
import { MAP_AVATAR_CONTAINER_SELECTOR } from '../src/lib/mapLabel';
import { MAP_PIN_SELECTOR } from '../src/lib/roundPins';
import {
  RESULT_LIST_ITEM_SELECTOR,
  RESULT_LIST_ROUND_NUMBER_SELECTOR,
  RESULT_LIST_WRAPPER_SELECTOR,
  addMetaButtonsToRounds,
  findBreakdownListWrapper
} from '../src/lib/singlePlayer';
import { LIVE_CHALLENGE_CONTAINER_SELECTOR, ROUND_PIN_SELECTOR } from '../src/lib/liveChallenge';
import { RESULT_MAP_SELECTOR } from '../src/lib/mapArea';

vi.mock('$', () => ({
  GM_xmlhttpRequest: vi.fn(),
  unsafeWindow: globalThis
}));
vi.mock('svelte', () => ({ mount: vi.fn(), unmount: vi.fn() }));
vi.mock('../src/lib/components/MapGroupUpdate.svelte', () => ({ default: {} }));
vi.mock('../src/lib/components/MapLabel.svelte', () => ({ default: {} }));
vi.mock('../src/lib/App.svelte', () => ({ default: {} }));

function matchesClassSubstrings(selector: string, className: string): boolean {
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => {
      const match = part.match(/^\[class\*=["']?([^"'\]]+)["']?\]$/);
      return match ? className.includes(match[1]) : false;
    });
}

describe('GeoGuessr CSS module selectors', () => {
  test('Creator Hub button selector matches Vite/Rolldown and legacy Next.js classes', () => {
    expect(matchesClassSubstrings(CREATE_MAP_BUTTON_SELECTOR, '_createMapButton_1jlpk_9')).toBe(
      true
    );
    expect(
      matchesClassSubstrings(CREATE_MAP_BUTTON_SELECTOR, 'creators-hub_createMapButton__abc12')
    ).toBe(true);
  });

  test('Map detail avatar selector matches Vite/Rolldown and legacy Next.js classes', () => {
    expect(matchesClassSubstrings(MAP_AVATAR_CONTAINER_SELECTOR, '_heroImageArea_xpbq9_44')).toBe(
      true
    );
    expect(
      matchesClassSubstrings(MAP_AVATAR_CONTAINER_SELECTOR, 'map-detail-page_heroImageArea__abc12')
    ).toBe(true);
    expect(
      matchesClassSubstrings(MAP_AVATAR_CONTAINER_SELECTOR, 'map-block_mapImageContainer__xyz99')
    ).toBe(true);
  });

  test('Round pin selector matches _mapPin_ without matching _largeMapPin_ alone', () => {
    expect(matchesClassSubstrings(MAP_PIN_SELECTOR, '_mapPin_bio2m_1 _clickable_bio2m_16')).toBe(
      true
    );
    expect(matchesClassSubstrings(MAP_PIN_SELECTOR, 'map-pin_mapPin__abc12')).toBe(true);
    expect(matchesClassSubstrings(MAP_PIN_SELECTOR, '_largeMapPin_bio2m_9')).toBe(false);
  });

  test('Breakdown result list selectors match Vite/Rolldown and legacy Next.js classes', () => {
    expect(matchesClassSubstrings(RESULT_LIST_WRAPPER_SELECTOR, '_listWrapper_ku647_31')).toBe(
      true
    );
    expect(
      matchesClassSubstrings(RESULT_LIST_WRAPPER_SELECTOR, 'result-list_listWrapper__7SmiM')
    ).toBe(true);

    expect(matchesClassSubstrings(RESULT_LIST_ITEM_SELECTOR, '_listItemWrapper_ku647_91')).toBe(
      true
    );
    expect(
      matchesClassSubstrings(RESULT_LIST_ITEM_SELECTOR, 'result-list_listItemWrapper___XCGn')
    ).toBe(true);

    expect(
      matchesClassSubstrings(RESULT_LIST_ROUND_NUMBER_SELECTOR, '_roundNumber_ku647_113')
    ).toBe(true);
    expect(
      matchesClassSubstrings(RESULT_LIST_ROUND_NUMBER_SELECTOR, 'result-list_roundNumber__RlIKm')
    ).toBe(true);
  });

  test('Live challenge selectors match Vite/Rolldown and legacy Next.js classes', () => {
    expect(matchesClassSubstrings(ROUND_PIN_SELECTOR, '_roundPin_2qsoe_21')).toBe(true);
    expect(matchesClassSubstrings(ROUND_PIN_SELECTOR, 'result-map_roundPin__abc12')).toBe(true);
    expect(matchesClassSubstrings(ROUND_PIN_SELECTOR, '_smallRoundPin_2qsoe_26')).toBe(false);

    expect(LIVE_CHALLENGE_CONTAINER_SELECTOR).toContain('[class*="game_container"]');
    expect(LIVE_CHALLENGE_CONTAINER_SELECTOR).toContain(
      '[data-game-hud][class*="_backdrop_"] ~ [class*="_container_"]'
    );
  });

  test('Result map selector matches Vite/Rolldown and legacy Next.js classes', () => {
    expect(matchesClassSubstrings(RESULT_MAP_SELECTOR, '_map_ihtfe_1')).toBe(true);
    expect(matchesClassSubstrings(RESULT_MAP_SELECTOR, '_map_nhlpe_1')).toBe(true);
    expect(matchesClassSubstrings(RESULT_MAP_SELECTOR, 'coordinate-result-map_map__abc12')).toBe(
      true
    );
  });
});

describe('addMetaButtonsToRounds', () => {
  test('findBreakdownListWrapper skips unrelated _listWrapper_ elements without round numbers', () => {
    const sidebarList = { querySelector: () => null };
    const breakdownList = {
      querySelector: (selector: string) =>
        selector === RESULT_LIST_ROUND_NUMBER_SELECTOR ? { textContent: '1' } : null
    };
    const root = {
      querySelectorAll: (selector: string) =>
        selector === RESULT_LIST_WRAPPER_SELECTOR ? [sidebarList, breakdownList] : []
    };

    expect(findBreakdownListWrapper(root as unknown as ParentNode)).toBe(breakdownList);
  });

  test('adds Show meta button and geometa-round-item class on new _listItemWrapper_ rows', () => {
    const appended: Record<string, any>[] = [];
    const addedClasses = new Set<string>();
    const row = {
      classList: { add: (name: string) => addedClasses.add(name) },
      querySelector: (selector: string) => {
        if (selector === RESULT_LIST_ROUND_NUMBER_SELECTOR) return { textContent: '2' };
        if (selector === '.geometa-meta-btn') return appended[0] ?? null;
        return null;
      },
      appendChild: (node: Record<string, any>) => appended.push(node)
    };
    const root = {
      querySelectorAll: (selector: string) => (selector === RESULT_LIST_ITEM_SELECTOR ? [row] : [])
    };

    const savedDocument = globalThis.document;
    Object.assign(globalThis, {
      document: {
        createElement: () => ({
          className: '',
          textContent: '',
          title: '',
          addEventListener: vi.fn()
        })
      }
    });

    try {
      const rounds = [
        { location: { lat: 0, lng: 0, panoId: 'p1' } },
        { location: { lat: 1, lng: 1, panoId: 'p2' } }
      ];
      addMetaButtonsToRounds(rounds, 'map-1', root as unknown as ParentNode);
      addMetaButtonsToRounds(rounds, 'map-1', root as unknown as ParentNode);

      expect(addedClasses.has('geometa-round-item')).toBe(true);
      expect(appended).toHaveLength(1);
      expect(appended[0].className).toBe('geometa-meta-btn');
      expect(appended[0].textContent).toBe('Show meta');
    } finally {
      Object.assign(globalThis, { document: savedDocument });
    }
  });
});
