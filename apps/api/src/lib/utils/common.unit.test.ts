import { describe, expect, test } from 'bun:test';
import { assertNotNullish, isPgError, isUniqueViolation } from './common';

describe('database error helpers', () => {
  test('recognizes wrapped PostgreSQL errors', () => {
    const error = {
      cause: { code: '23505', constraint_name: 'maps_geoguessr_id_unique' },
    };

    expect(isPgError(error, '23505')).toBe(true);
    expect(isUniqueViolation(error, 'maps_geoguessr_id_unique')).toBe(true);
    expect(isUniqueViolation(error, 'other_constraint')).toBe(false);
  });

  test('asserts nullish values', () => {
    expect(() => assertNotNullish(undefined, 'missing')).toThrow('missing');
    expect(() => assertNotNullish(0)).not.toThrow();
  });
});
