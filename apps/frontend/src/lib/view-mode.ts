export type ViewMode = 'cards' | 'list';

export const MAPS_VIEW_MODE_COOKIE = 'maps-view-mode';
export const METAS_VIEW_MODE_COOKIE = 'metas-view-mode';

export function parseViewMode(value: string | undefined, fallback: ViewMode): ViewMode {
  return value === 'cards' || value === 'list' ? value : fallback;
}
