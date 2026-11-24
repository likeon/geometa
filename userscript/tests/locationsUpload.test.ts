import { describe, expect, test, vi } from 'vitest';
import {
  extractMapIdFromMapMakerUrl,
  findTopBarMenuContainer,
  findUploadInsertionPoint
} from '../src/lib/locationsUpload';

vi.mock('$', () => ({
  GM_xmlhttpRequest: vi.fn(),
  unsafeWindow: globalThis
}));
vi.mock('svelte', () => ({ mount: vi.fn(), unmount: vi.fn() }));
vi.mock('../src/lib/components/UploadLocations.svelte', () => ({ default: {} }));

type FakeElement = {
  className: string;
  dataQa?: string;
  children: FakeElement[];
  parentElement: FakeElement | null;
  lastElementChild: FakeElement | null;
  contains: (node: FakeElement | null) => boolean;
  querySelector: (selector: string) => FakeElement | null;
};

function matchesSelector(element: FakeElement, selector: string): boolean {
  if (selector === '[class*="_topBarMenu_"]') {
    return element.className.includes('_topBarMenu_');
  }
  const qaMatch = selector.match(/^\[data-qa="([^"]+)"\]$/);
  if (qaMatch) {
    return element.dataQa === qaMatch[1];
  }
  return false;
}

function createElement(
  options: { className?: string; dataQa?: string; children?: FakeElement[] } = {}
): FakeElement {
  const element: FakeElement = {
    className: options.className ?? '',
    dataQa: options.dataQa,
    children: [],
    parentElement: null,
    get lastElementChild() {
      return this.children[this.children.length - 1] ?? null;
    },
    contains(target) {
      let cur = target;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentElement;
      }
      return false;
    },
    querySelector(selector) {
      for (const child of this.children) {
        if (matchesSelector(child, selector)) return child;
        const found = child.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
  };

  for (const child of options.children ?? []) {
    child.parentElement = element;
    element.children.push(child);
  }
  return element;
}

describe('extractMapIdFromMapMakerUrl', () => {
  test('extracts the map ID from standard, locale-prefixed, and query URLs', () => {
    expect(
      extractMapIdFromMapMakerUrl('https://www.geoguessr.com/map-maker/67695a0a9c0874b92709eedb')
    ).toBe('67695a0a9c0874b92709eedb');
    expect(
      extractMapIdFromMapMakerUrl(
        'https://www.geoguessr.com/fr/map-maker/67695a0a9c0874b92709eedb?tab=locations#top'
      )
    ).toBe('67695a0a9c0874b92709eedb');
    expect(extractMapIdFromMapMakerUrl('https://www.geoguessr.com/creator-hub')).toBeNull();
  });
});

describe('findTopBarMenuContainer and findUploadInsertionPoint', () => {
  test('finds the Vite/Rolldown _topBarMenu_ container and inserts before the publish trigger', () => {
    const publishButton = createElement({
      className: '_root_b2c7b_12 _publishButton_16lzp_75',
      dataQa: 'open-publish-dialog'
    });
    const publishWrapper = createElement({
      className: '_trigger_1ln81_1',
      children: [publishButton]
    });
    const topBarMenu = createElement({
      className: '_topBarMenu_4mk3i_12',
      children: [
        createElement({ className: '_label_1bm0j_31' }),
        createElement({ className: '_settingsButtonGeneral_4mk3i_27' }),
        createElement({ className: '_iconButton_x89oi_1', dataQa: 'hamburger-menu' }),
        createElement({ className: '_root_1a3du_4' }),
        publishWrapper
      ]
    });
    const root = createElement({ className: '_menu_cmqze_87', children: [topBarMenu] });

    const container = findTopBarMenuContainer(root as unknown as ParentNode);
    expect(container).toBe(topBarMenu);
    expect(findUploadInsertionPoint(container!)).toBe(publishWrapper);
  });

  test('continues to match the legacy Next.js top-bar-menu_topBarMenu__ class', () => {
    const publishButton = createElement({ className: 'button_button__abc' });
    const topBarMenu = createElement({
      className: 'top-bar-menu_topBarMenu__kd9zX',
      children: [createElement(), publishButton]
    });
    const root = createElement({ children: [topBarMenu] });

    const container = findTopBarMenuContainer(root as unknown as ParentNode);
    expect(container).toBe(topBarMenu);
    expect(findUploadInsertionPoint(container!)).toBe(publishButton);
  });

  test('falls back to data-qa structure if the top bar class name changes again', () => {
    const publishButton = createElement({ dataQa: 'open-publish-dialog' });
    const publishWrapper = createElement({ children: [publishButton] });
    const topBarMenu = createElement({
      className: '_renamed_xyz_1',
      children: [createElement({ dataQa: 'hamburger-menu' }), createElement(), publishWrapper]
    });
    const root = createElement({ children: [topBarMenu] });

    const container = findTopBarMenuContainer(root as unknown as ParentNode);
    expect(container).toBe(topBarMenu);
    expect(findUploadInsertionPoint(container!)).toBe(publishWrapper);
  });
});
