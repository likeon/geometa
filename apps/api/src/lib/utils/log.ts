import { prod } from '@api/lib/utils/env';
import type { BunRequest, Server } from 'bun';
import Elysia, { type StatusMap } from 'elysia';

export function getRequestIp(
  server: Server<undefined> | null,
  request: BunRequest,
) {
  return (
    request.headers.get('cf-connecting-ip') ||
    server?.requestIP(request)?.address
  );
}

function paramsToObject(searchParams: URLSearchParams) {
  const obj: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams.entries()) {
    // Handle multiple values for the same key
    if (obj[key]) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

function statusToNumber(
  value: number | keyof StatusMap | undefined,
): number | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }
  return Number(value);
}

function logRequest(
  startTime: number,
  server: Server<undefined> | null,
  request: BunRequest,
  status: number | null,
) {
  const { pathname, searchParams } = new URL(request.url);
  if (prod && pathname === '/api/health-check') {
    return;
  }
  const error = status ? status >= 400 : true;
  const data = {
    level: error ? 'error' : 'info',
    type: 'request',
    method: request.method,
    path: pathname,
    status: status,
    searchParams: paramsToObject(searchParams),
    rt: Math.round(performance.now() - startTime),
    ip: getRequestIp(server, request),
  };
  const responseJson = JSON.stringify(data);
  try {
    console[error ? 'error' : 'log'](responseJson);
  } catch (err) {
    console.error('Failed to log response:', err);
  }
}

type LoggerStore = {
  startTime: number;
};

const _ignoredErrors = ['VALIDATION', 'PARSE', 'NOT_FOUND'];

export const logger = () => {
  return new Elysia({
    name: 'logger',
  })
    .onRequest((ctx) => {
      ctx.store = {
        ...ctx.store,
        startTime: performance.now(),
      };
    })
    .onAfterResponse(({ server, request, set, store, response }) => {
      const loggerStore = store as unknown as LoggerStore;
      let status: number | null;
      if (
        response &&
        typeof response === 'object' &&
        'code' in response &&
        typeof response.code === 'number'
      ) {
        status = response.code;
      } else {
        status = statusToNumber(set.status);
      }
      logRequest(loggerStore.startTime, server, request as BunRequest, status);
    })
    .onError(({ server, request, error, code, store }) => {
      const loggerStore = store as unknown as LoggerStore;
      let status: number | null;
      if ('status' in error) {
        status = error.status;
      } else {
        status = null;
      }
      logRequest(loggerStore.startTime, server, request as BunRequest, status);
      switch (code) {
        case 'VALIDATION':
        case 'PARSE':
        case 'NOT_FOUND':
          break;
        default:
          console.error(error);
      }
    })
    .as('global');
};
