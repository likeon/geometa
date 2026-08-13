import { describe, expect, test } from 'bun:test';
import {
  extractLiveChallengeId,
  findPartyLiveChallengeId,
  isPartyLobbyPath
} from '../src/lib/utils/liveChallengeId';

describe('live challenge IDs', () => {
  test('extracts an ID from the public live-challenge route', () => {
    expect(extractLiveChallengeId('/live-challenge/game-id')).toBe('game-id');
  });

  test('extracts an ID from the game-server API request', () => {
    expect(
      extractLiveChallengeId('https://game-server.geoguessr.com/api/live-challenge/game-id')
    ).toBe('game-id');
  });

  test('recognizes party lobby routes with query strings', () => {
    expect(isPartyLobbyPath(new URL('https://www.geoguessr.com/party/lobby/WGUL5?j=1').pathname)).toBe(
      true
    );
  });

  test('uses the newest live-challenge request while on a party lobby route', () => {
    expect(
      findPartyLiveChallengeId('/party/lobby/WGUL5', [
        'https://game-server.geoguessr.com/api/live-challenge/old-game',
        'https://game-server.geoguessr.com/api/parties/v2/party-id/lobby',
        'https://game-server.geoguessr.com/api/live-challenge/current-game'
      ])
    ).toBe('current-game');
  });

  test('prefers the newest request over a cached game from the same party lobby', () => {
    expect(
      findPartyLiveChallengeId(
        '/party/lobby/WGUL5',
        ['https://game-server.geoguessr.com/api/live-challenge/current-game'],
        { id: 'previous-game', partyLobbyPath: '/party/lobby/WGUL5' }
      )
    ).toBe('current-game');
  });

  test('falls back to the cached game when its request is no longer recorded', () => {
    expect(
      findPartyLiveChallengeId('/party/lobby/WGUL5', [], {
        id: 'current-game',
        partyLobbyPath: '/party/lobby/WGUL5'
      })
    ).toBe('current-game');
  });

  test('does not reuse observed game requests outside a party lobby', () => {
    expect(
      findPartyLiveChallengeId('/maps/map-id', [
        'https://game-server.geoguessr.com/api/live-challenge/game-id'
      ])
    ).toBeNull();
  });
});
