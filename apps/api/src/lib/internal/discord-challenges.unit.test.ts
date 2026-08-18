import { describe, expect, test } from 'bun:test';
import {
  type ChallengeMapCandidate,
  challengeDailyKey,
  formatChallengeDate,
  isRecencyFilterEnabled,
  recencyWeight,
  selectWeightedMaps,
} from './discord-challenges';

const NOW = 2_000_000_000;
const DAY = 86_400;

function candidate(
  id: number,
  lastSelectedAt: number | null,
): ChallengeMapCandidate {
  return {
    id,
    geoguessrId: `map-${id}`,
    name: `Map ${id}`,
    authors: 'Author',
    difficulty: 1,
    lastSelectedAt,
  };
}

describe('daily challenge date', () => {
  test('formats the Berlin calendar date', () => {
    const date = new Date('2026-08-17T22:30:00Z');
    expect(formatChallengeDate(date)).toBe('18 August 2026');
    expect(challengeDailyKey(date)).toBe('2026-08-18');
  });
});

describe('daily challenge recency filter setting', () => {
  test('defaults to enabled and parses boolean values', () => {
    expect(isRecencyFilterEnabled(undefined)).toBe(true);
    expect(isRecencyFilterEnabled('true')).toBe(true);
    expect(isRecencyFilterEnabled('false')).toBe(false);
  });

  test('rejects invalid values', () => {
    expect(() => isRecencyFilterEnabled('TRUE')).toThrow(
      'DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED must be true or false',
    );
  });
});

describe('daily challenge recency weighting', () => {
  test('strongly favors older and never-selected maps', () => {
    expect(recencyWeight(NOW, NOW)).toBe(1);
    expect(recencyWeight(NOW - 30 * DAY, NOW)).toBe(31 ** 2);
    expect(recencyWeight(NOW - 90 * DAY, NOW)).toBe(91 ** 2);
    expect(recencyWeight(NOW - 365 * DAY, NOW)).toBe(91 ** 2);
    expect(recencyWeight(null, NOW)).toBe(91 ** 2);
  });

  test('samples by weight without replacement', () => {
    const selected = selectWeightedMaps(
      [candidate(1, NOW), candidate(2, NOW - 90 * DAY)],
      2,
      NOW,
      () => 0.5,
    );

    expect(selected.map((map) => map.id)).toEqual([2, 1]);
  });
});
