import { mountSummaryWindow } from './utils/summaryWindow';

export function showMetaForRound(
  panoId: string,
  mapId: string,
  userscriptVersion: string,
  roundNumber: number
) {
  const container = document.querySelector('div[data-qa="result-view-top"]') || document.body;

  mountSummaryWindow(container, {
    roundNumber,
    panoId,
    mapId,
    userscriptVersion,
    source: window.location.href.includes('challenge') ? 'challenge' : 'map'
  });
}

/**
 * Watches for round pins on a results map and adds clickable "?" icons
 * that open the meta window for that round. Returns the observer so the
 * caller can disconnect it on navigation.
 */
export function createPinObserver(
  panoIds: string[],
  mapId: string,
  userscriptVersion: string
): MutationObserver {
  const observer = new MutationObserver(() => {
    const pins = document.querySelectorAll('[class*="map-pin_mapPin"]');
    pins.forEach((pin) => {
      const pinText = pin.textContent?.trim();
      const roundNumber = parseInt(pinText || '');

      if (
        roundNumber >= 1 &&
        roundNumber <= panoIds.length &&
        !pin.hasAttribute('data-geometa-pin-processed')
      ) {
        pin.setAttribute('data-geometa-pin-processed', 'true');

        const questionIcon = document.createElement('div');
        questionIcon.className = 'geometa-pin-question';
        questionIcon.innerHTML = '?';
        questionIcon.title = `View meta for round ${roundNumber}`;

        questionIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showMetaForRound(panoIds[roundNumber - 1], mapId, userscriptVersion, roundNumber);
        });

        const pinElement = pin as HTMLElement;
        if (pinElement.style.position === '' || pinElement.style.position === 'static') {
          pinElement.style.position = 'relative';
        }

        pinElement.appendChild(questionIcon);
      }
    });
  });

  // childList is enough - pins arrive as new nodes, and observing attributes
  // makes the callback re-trigger on its own setAttribute calls
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}
