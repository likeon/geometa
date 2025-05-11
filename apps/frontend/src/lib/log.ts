// https://github.com/delay/sveltekit-auth-starter/blob/main/src/lib/server/log.ts

import type { RequestEvent } from '@sveltejs/kit';

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

export default async function log(statusCode: number, event: RequestEvent) {
  try {
    let level = 'info';
    if (statusCode >= 400) {
      level = 'error';
    }
    const logData: object = {
      level: level,
      type: 'request',
      method: event.request.method,
      path: event.url.pathname,
      status: statusCode,
      searchParams: paramsToObject(event.url.searchParams),
      rt: Date.now() - event.locals.startTime,
      user: event.locals.user?.id,
      ip: event.request.headers.get('cf-connecting-ip') || event.getClientAddress?.()
    };
    console.log(JSON.stringify(logData));
  } catch (err) {
    throw new Error(`Failed to log: ${JSON.stringify(err)}`);
  }
}
