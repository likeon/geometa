import { decodePanoId, getMapInfo, logInfo } from './utils/main';
import { createPinObserver } from './roundPins';

export function extractResultsTokenFromUrl(url: string) {
  const match = url.match(/\/results\/([^\/?#]+)/);
  return match ? match[1] : null;
}

let pinObserver: MutationObserver | null = null;
let runToken = 0;

export function initChallengeResults() {
  addChallengeResultsPins();
  window.addEventListener('urlchange', () => {
    addChallengeResultsPins();
  });
}

async function addChallengeResultsPins() {
  const token = ++runToken;

  if (pinObserver) {
    pinObserver.disconnect();
    pinObserver = null;
  }

  const resultsToken = extractResultsTokenFromUrl(window.location.href);
  if (!resultsToken) {
    return;
  }

  try {
    const url = `https://www.geoguessr.com/api/v3/results/highscores/${resultsToken}?friends=false&limit=1`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      logInfo(`failed to fetch challenge results (status ${response.status})`);
      return;
    }
    const data = await response.json();
    const game = data?.items?.[0]?.game;
    if (!game?.map || !Array.isArray(game.rounds) || game.rounds.length === 0) {
      logInfo('no game data in challenge results payload');
      return;
    }
    if (token !== runToken) {
      return;
    }

    const mapInfo = await getMapInfo(game.map, false);
    if (token !== runToken || !mapInfo.mapFound) {
      return;
    }

    const panoIds = game.rounds.map((round: { panoId: string }) => decodePanoId(round.panoId));
    logInfo(`adding meta pins for challenge results (${panoIds.length} rounds)`);
    pinObserver = createPinObserver(panoIds, game.map, mapInfo.userscriptVersion);
  } catch (e) {
    logInfo('failed to add meta pins on challenge results', e);
  }
}
