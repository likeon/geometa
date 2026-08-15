import type { RequestEvent } from '@sveltejs/kit';

import { createLoginBypassSession, isLoginBypassEnabled } from '$lib/login-bypass';

export async function GET(event: RequestEvent) {
  const userId = event.url.searchParams.get('uid');
  if (!userId || !isLoginBypassEnabled()) {
    return new Response(null, { status: 400 });
  }
  await createLoginBypassSession(event, userId);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/map-making'
    }
  });
}
