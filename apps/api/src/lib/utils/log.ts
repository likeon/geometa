import Elysia, { StatusMap } from 'elysia';
import { BunRequest, Server } from 'bun';

export function getRequestIp(server: Server | null, request: BunRequest) {
  return request.headers.get('cf-connecting-ip') || server?.requestIP(request)?.address;
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


function statusToNumber(value: number | keyof StatusMap | undefined): number | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }
  return Number(value);
}

function logRequest(startTime: number, server: Server | null, request: BunRequest, status: number | null) {
  const { pathname, searchParams } = new URL(request.url);
  if (process.env.NODE_ENV === 'production' && pathname == '/api/health-check') {
    return;
  }
  const error = (status ? status >= 400 : true);
  const data = {
    level: (error ? 'error' : 'info'),
    type: 'request',
    method: request.method,
    path: pathname,
    status: status,
    searchParams: paramsToObject(searchParams),
    rt: Math.round(
      performance.now() - startTime
    ),
    ip: getRequestIp(server, request),
  };
  const responseJson = JSON.stringify(data);
  if (error) {
    console.error(responseJson);
  } else {
    console.log(responseJson);
  }
}

export const logger = () => {
  const app = new Elysia({
    name: 'logger'
  });

  app
    .onRequest(ctx => {
      ctx.store = {
        ...ctx.store,
        ['startTime']: performance.now()
      };
    })
    .onAfterResponse(({ server, request, set, store }) => {
      logRequest((store as any)['startTime'], server, request as BunRequest, statusToNumber(set.status));
    })
    .onError(({ server, request, error, store }) => {
      let status: number | null;
      if ('status' in error) {
        status = error.status;
      } else {
        status = null;
      }
      logRequest((store as any)['startTime'], server, request as BunRequest, status);
    });

  return app.as('global');
};
