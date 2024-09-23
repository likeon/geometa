// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { Buffer } from 'buffer';

export const handle: Handle = async ({ event, resolve }) => {
  // Check if the request URL starts with /dev
  if (event.url.pathname.startsWith('/dev')) {
    const auth = event.request.headers.get('Authorization');
    if (auth) {
      const [scheme, encoded] = auth.split(' ');

      if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');

        const validUsername = 'hokkaido';
        const validPassword = 'krakow';

        if (username === validUsername && password === validPassword) {
          // Authentication successful, proceed to resolve the request
          return resolve(event);
        }
      }
    }

    // Authentication failed, return 401 Unauthorized
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Restricted Area"',
      },
    });
  }

  // For other URLs, proceed as normal
  return resolve(event);
};
