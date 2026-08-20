import { GM_getValue, GM_setValue } from '$';

export const API_KEY_STORAGE_NAME = 'learnableMeta_apiKey';
export const URL_TO_GENERATE_TOKEN = 'https://learnablemeta.com/profile/token';

export function getApiKey(): string | null {
  const key = GM_getValue<string | null>(API_KEY_STORAGE_NAME, null);
  return key?.trim() || null;
}

export function saveApiKey(key: string): void {
  GM_setValue(API_KEY_STORAGE_NAME, key.trim());
}

export function clearApiKey(): void {
  GM_setValue(API_KEY_STORAGE_NAME, '');
}
