import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
const nonBlankString = z.string().refine((value) => value.trim().length > 0, {
  message: 'Must not be blank',
});
const optionalHttpUrl = z
  .url()
  .refine((value) => /^(https?):/.test(value), {
    message: 'Must use HTTP or HTTPS',
  })
  .optional();
const optionalPostgresUrl = z
  .url()
  .refine((value) => /^(postgres|postgresql):/.test(value), {
    message: 'Must use postgres or postgresql protocol',
  })
  .optional();

const environmentSchema = {
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: optionalPostgresUrl,
  DATABASE_PASSWORD: nonBlankString.optional(),
  DRIZZLE_LOGGER: booleanString.default(false),
  API_INTERNAL_AUTH_REQUIRED: booleanString.default(true),
  FRONTEND_API_TOKEN: nonBlankString.optional(),
  NFCA_TOKEN: nonBlankString.optional(),
  SENTRY_DSN: optionalHttpUrl,
  IMAGES_S3_URL: optionalHttpUrl,
  IMAGES_S3_ACCESS_KEY: nonBlankString.optional(),
  IMAGES_S3_SECRET_KEY: nonBlankString.optional(),
  GOOGLE_MAPS_API_KEY: nonBlankString.optional(),
  DISCORD_CHALLENGE_RECENCY_FILTER_ENABLED: booleanString.default(true),
};

export class ConfigError extends Error {
  constructor(
    issues: readonly { message: string; path?: readonly unknown[] }[],
  ) {
    const details = issues
      .map((issue) => {
        const path = issue.path?.map(String).join('.') || 'config';
        return `${path}: ${issue.message}`;
      })
      .join('; ');
    super(`Invalid application config: ${details}`);
    this.name = 'ConfigError';
  }
}

export function createConfig(
  runtimeEnv: Record<string, string | undefined> = process.env,
) {
  return createEnv({
    server: environmentSchema,
    runtimeEnv: { ...runtimeEnv },
    emptyStringAsUndefined: true,
    createFinalSchema: (shape) =>
      z.object(shape).superRefine((config, context) => {
        const s3Values = [
          config.IMAGES_S3_URL,
          config.IMAGES_S3_ACCESS_KEY,
          config.IMAGES_S3_SECRET_KEY,
        ];
        const configuredS3Values = s3Values.filter(
          (value) => value !== undefined,
        ).length;
        if (
          configuredS3Values !== 0 &&
          configuredS3Values !== s3Values.length
        ) {
          context.addIssue({
            code: 'custom',
            path: ['IMAGES_S3_URL'],
            message:
              'IMAGES_S3_URL, IMAGES_S3_ACCESS_KEY, and IMAGES_S3_SECRET_KEY must be configured together',
          });
        }
      }),
    onValidationError: (issues) => {
      throw new ConfigError(issues);
    },
  });
}

export type ApplicationConfig = ReturnType<typeof createConfig>;
export type ConfigProfile = 'api' | 'street-view';

export const config = createConfig();

function createProfileSchema(profile: ConfigProfile) {
  return z.custom<ApplicationConfig>().superRefine((config, context) => {
    const requireValue = (key: keyof ApplicationConfig) => {
      if (config[key] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `Required for ${profile} startup`,
        });
      }
    };

    if (profile === 'api' && config.API_INTERNAL_AUTH_REQUIRED) {
      requireValue('FRONTEND_API_TOKEN');
    }
    if (profile === 'street-view') {
      requireValue('GOOGLE_MAPS_API_KEY');
    }
    if (config.NODE_ENV !== 'production') {
      return;
    }

    if (
      config.DATABASE_URL === undefined &&
      config.DATABASE_PASSWORD === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL or DATABASE_PASSWORD is required in production',
      });
    }
    requireValue('SENTRY_DSN');

    if (profile === 'api') {
      requireValue('NFCA_TOKEN');
      requireValue('IMAGES_S3_URL');
      requireValue('IMAGES_S3_ACCESS_KEY');
      requireValue('IMAGES_S3_SECRET_KEY');
    }
  });
}

export function validateConfigProfile(
  profile: ConfigProfile,
  applicationConfig: ApplicationConfig = config,
): ApplicationConfig {
  const result = createProfileSchema(profile).safeParse(applicationConfig);
  if (!result.success) {
    throw new ConfigError(result.error.issues);
  }
  return applicationConfig;
}

export function getDatabaseConfig(
  applicationConfig: ApplicationConfig = config,
) {
  if (applicationConfig.DATABASE_URL !== undefined) {
    return {
      leaderUrl: applicationConfig.DATABASE_URL,
      replicaUrl: applicationConfig.DATABASE_URL,
    };
  }
  if (applicationConfig.DATABASE_PASSWORD !== undefined) {
    const password = encodeURIComponent(applicationConfig.DATABASE_PASSWORD);
    return {
      leaderUrl: `postgresql://geometa:${password}@postgres/geometa?sslmode=require`,
      replicaUrl: `postgresql://geometa:${password}@postgres-repl/geometa?sslmode=require`,
    };
  }
  const localUrl = 'postgresql://postgres:postgres@localhost/geometa';
  return { leaderUrl: localUrl, replicaUrl: localUrl };
}
