import { describe, expect, test } from 'bun:test';
import {
  ConfigError,
  createConfig,
  getDatabaseConfig,
  validateConfigProfile,
} from './config';

describe('application config schema', () => {
  test('applies safe local defaults and transforms primitive values', () => {
    const config = createConfig({
      SERVER_PORT: '4100',
      DRIZZLE_LOGGER: 'true',
      API_INTERNAL_AUTH_REQUIRED: 'false',
      DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED: 'false',
    });

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      SERVER_PORT: 4100,
      DRIZZLE_LOGGER: true,
      API_INTERNAL_AUTH_REQUIRED: false,
      DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED: false,
    });
    expect(getDatabaseConfig(config)).toEqual({
      leaderUrl: 'postgresql://postgres:postgres@localhost/geometa',
      replicaUrl: 'postgresql://postgres:postgres@localhost/geometa',
    });
  });

  test('treats empty strings as missing values', () => {
    const config = createConfig({
      API_INTERNAL_AUTH_REQUIRED: 'false',
      NFCA_TOKEN: '',
    });

    expect(config.NFCA_TOKEN).toBeUndefined();
  });

  test.each([
    ['SERVER_PORT', '0'],
    ['SERVER_PORT', '65536'],
    ['DRIZZLE_LOGGER', 'TRUE'],
    ['DATABASE_URL', 'https://example.com/database'],
    ['SENTRY_DSN', 'not-a-url'],
  ])('rejects invalid %s', (name, value) => {
    expect(() =>
      createConfig({
        API_INTERNAL_AUTH_REQUIRED: 'false',
        [name]: value,
      }),
    ).toThrow(ConfigError);
  });

  test('requires all S3 settings when any are configured', () => {
    expect(() =>
      createConfig({
        API_INTERNAL_AUTH_REQUIRED: 'false',
        IMAGES_S3_URL: 'https://images.example.com',
      }),
    ).toThrow('must be configured together');
  });

  test('builds encoded cluster database URLs from password config', () => {
    const config = createConfig({
      API_INTERNAL_AUTH_REQUIRED: 'false',
      DATABASE_PASSWORD: 'password/with?reserved#characters',
    });

    expect(getDatabaseConfig(config)).toEqual({
      leaderUrl:
        'postgresql://geometa:password%2Fwith%3Freserved%23characters@postgres/geometa?sslmode=require',
      replicaUrl:
        'postgresql://geometa:password%2Fwith%3Freserved%23characters@postgres-repl/geometa?sslmode=require',
    });
  });
});

describe('startup config profiles', () => {
  test('requires frontend token when API auth is enabled', () => {
    const config = createConfig({ API_INTERNAL_AUTH_REQUIRED: 'true' });

    expect(() => validateConfigProfile('api', config)).toThrow(
      'FRONTEND_API_TOKEN',
    );
  });

  test('allows local API startup with auth explicitly disabled', () => {
    const config = createConfig({ API_INTERNAL_AUTH_REQUIRED: 'false' });

    expect(validateConfigProfile('api', config)).toBe(config);
  });

  test('requires production API integrations', () => {
    const config = createConfig({
      NODE_ENV: 'production',
      API_INTERNAL_AUTH_REQUIRED: 'false',
    });

    expect(() => validateConfigProfile('api', config)).toThrow(
      /DATABASE_URL.*SENTRY_DSN.*NFCA_TOKEN.*IMAGES_S3_URL/,
    );
  });

  test('accepts complete production API config', () => {
    const config = createConfig({
      NODE_ENV: 'production',
      DATABASE_PASSWORD: 'database-password',
      API_INTERNAL_AUTH_REQUIRED: 'true',
      FRONTEND_API_TOKEN: 'frontend-token',
      NFCA_TOKEN: 'nfca-token',
      SENTRY_DSN: 'https://public@example.com/1',
      IMAGES_S3_URL: 'https://images.example.com',
      IMAGES_S3_ACCESS_KEY: 'access-key',
      IMAGES_S3_SECRET_KEY: 'secret-key',
    });

    expect(validateConfigProfile('api', config)).toBe(config);
  });

  test('requires Google Maps key for Street View startup', () => {
    const config = createConfig({ API_INTERNAL_AUTH_REQUIRED: 'false' });

    expect(() => validateConfigProfile('street-view', config)).toThrow(
      'GOOGLE_MAPS_API_KEY',
    );
  });

  test('accepts local Street View config with Google Maps key', () => {
    const config = createConfig({
      API_INTERNAL_AUTH_REQUIRED: 'false',
      GOOGLE_MAPS_API_KEY: 'google-key',
    });

    expect(validateConfigProfile('street-view', config)).toBe(config);
  });
});
