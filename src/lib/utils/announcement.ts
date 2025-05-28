import { GM_xmlhttpRequest } from '$';

interface Announcement {
  timestamp: number;
  htmlMessage: string;
}

interface CachedItem {
  data: Announcement | null;
  fetchedAt: number;
}

const ANNOUNCEMENT_CACHE_KEY = 'geometa:cached-announcement';
// 1 hour cache
const ANNOUNCEMENT_CACHE_DURATION_MS = 60 * 60 * 1000;
const ANNOUNCEMENT_API_URL = 'https://learnablemeta.com/api/userscript/announcement/';

export async function getAnnouncement(): Promise<Announcement | null> {
  try {
    const cachedItemString = localStorage.getItem(ANNOUNCEMENT_CACHE_KEY);
    if (cachedItemString) {
      const cachedEntry: CachedItem = JSON.parse(cachedItemString);
      const now = Date.now();

      if (now - cachedEntry.fetchedAt < ANNOUNCEMENT_CACHE_DURATION_MS) {
        return cachedEntry.data;
      } else {
        localStorage.removeItem(ANNOUNCEMENT_CACHE_KEY);
      }
    }
  } catch (e) {
    localStorage.removeItem(ANNOUNCEMENT_CACHE_KEY);
  }

  return new Promise<Announcement | null>((resolve) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: ANNOUNCEMENT_API_URL,
      timeout: 3000,
      onload: (response) => {
        let announcementToCache: Announcement | null = null;

        if (response.status === 200) {
          try {
            if (response.responseText && response.responseText.trim().toLowerCase() !== 'null') {
              const parsedData = JSON.parse(response.responseText);
              if (parsedData && typeof parsedData.timestamp === 'number' && typeof parsedData.htmlMessage === 'string') {
                announcementToCache = parsedData as Announcement;
              }
            }
          } catch (parseError) {
            console.error('Failed to parse announcement JSON from API:', parseError, response.responseText);
          }
        } else {
          console.error(`Error fetching announcement from API: ${response.status} ${response.statusText}`);
        }

        const itemToCache: CachedItem = {
          data: announcementToCache,
          fetchedAt: Date.now()
        };
        try {
          localStorage.setItem(ANNOUNCEMENT_CACHE_KEY, JSON.stringify(itemToCache));
          console.log(announcementToCache ? 'Fetched announcement cached.' : 'Fetched \'no announcement\' state cached.');
        } catch (e) {
          console.warn('Error writing announcement state to localStorage cache:', e);
        }
        resolve(announcementToCache);
      },
      onerror: (error) => {
        console.error('Network error fetching announcement from API:', error);
        resolve(null);
      },
      ontimeout: () => {
        console.error('Timeout fetching announcement from API.');
        resolve(null);
      }
    });
  });
}


const LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY = 'geometa:last-dismissed-announcement';

export function getLastDismissedAnnouncementTimestamp(): number | null {
  try {
    const storedValue = localStorage.getItem(LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY);
    if (storedValue) {
      const timestamp = parseInt(storedValue, 10);
      return !isNaN(timestamp) ? timestamp : null;
    }
    return null;
  } catch (e) {
    console.warn('LocalStorage Error: Could not retrieve last dismissed announcement timestamp.', e);
    return null;
  }
}


export function markAnnouncementAsDismissed(announcementTimestamp: number): void {
  if (isNaN(announcementTimestamp)) {
    console.error('Invalid timestamp provided to markAnnouncementAsDismissed. Must be a number.', announcementTimestamp);
    return;
  }

  try {
    localStorage.setItem(LAST_DISMISSED_ANNOUNCEMENT_TIMESTAMP_KEY, announcementTimestamp.toString());
  } catch (e) {
    console.warn('LocalStorage Error: Could not save last dismissed announcement timestamp.', e);
  }
}
