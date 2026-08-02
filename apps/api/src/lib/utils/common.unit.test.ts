import { describe, expect, test } from 'bun:test';
import {
  assertNotNullish,
  generateRandomString,
  isPgError,
  isUniqueViolation,
} from './common';

describe('database error helpers', () => {
  test('recognizes wrapped PostgreSQL errors', () => {
    const error = {
      cause: { code: '23505', constraint_name: 'maps_geoguessr_id_unique' },
    };

    expect(isPgError(error, '23505')).toBe(true);
    expect(isUniqueViolation(error, 'maps_geoguessr_id_unique')).toBe(true);
    expect(isUniqueViolation(error, 'other_constraint')).toBe(false);
  });

  test('recognizes direct PostgreSQL errors', () => {
    const error = {
      code: '23505',
      constraint_name: 'maps_geoguessr_id_unique',
    };

    expect(isPgError(error, '23505')).toBe(true);
    expect(isUniqueViolation(error, 'maps_geoguessr_id_unique')).toBe(true);
    expect(isPgError(error, '23503')).toBe(false);
  });

  test('returns false for malformed or plain errors without throwing', () => {
    expect(isPgError(null, '23505')).toBe(false);
    expect(isPgError(undefined, '23505')).toBe(false);
    expect(isPgError(new Error('boom'), '23505')).toBe(false);
    expect(isPgError({}, '23505')).toBe(false);

    expect(isUniqueViolation(null, 'c')).toBe(false);
    expect(isUniqueViolation(new Error('boom'), 'c')).toBe(false);
    expect(isUniqueViolation({}, 'c')).toBe(false);
    expect(isUniqueViolation({ code: '23505' }, 'c')).toBe(false);
  });
});

describe('assertNotNullish', () => {
  test('asserts nullish values', () => {
    expect(() => assertNotNullish(undefined, 'missing')).toThrow('missing');
    expect(() => assertNotNullish(null, 'missing')).toThrow('missing');
    expect(() => assertNotNullish(null)).toThrow(
      'Value must not be null or undefined',
    );
    expect(() => assertNotNullish(0)).not.toThrow();
    expect(() => assertNotNullish('')).not.toThrow();
    expect(() => assertNotNullish(false)).not.toThrow();
  });
});

describe('generateRandomString', () => {
  test('generates string of expected length with allowed alphabet', () => {
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const result = generateRandomString(48);

    expect(result).toHaveLength(48);
    expect(result).toMatch(new RegExp(`^[${alphabet}]+$`));
  });
});
