import { treaty } from '@elysiajs/eden';
import { env } from '$env/dynamic/private';
import type { App } from '@api/api';
import { getRequestEvent } from '$app/server';
import { error, type NumericRange } from '@sveltejs/kit';
const frontendToken = env.FRONTEND_API_TOKEN;
const prod = env.NODE_ENV === 'production';

const apiHost = env.API_HOST || 'localhost:3000';

// @ts-expect-error Elysia type mismatch between frontend and API node_modules
export const api = treaty<App>(`http://${apiHost}`, {
  headers(path) {
    const headers: Record<string, unknown> = {};
    if (prod && frontendToken && path.startsWith('/api/internal')) {
      headers.authorization = `Bearer ${frontendToken}`;
    }

    const ev = getRequestEvent();
    if (ev.locals.user) {
      headers['x-api-user-id'] = ev.locals.user.id;
    }

    return headers;
  }
}).api;

/**
 * Throws a SvelteKit error() from an Eden error response. Eden can't see the
 * API's global 403 (it comes from an untyped onError hook), so the status cast
 * lives here in one place instead of at every call site. `messages` overrides
 * the text per status; 403 defaults to 'Permission denied' and any unmapped
 * status falls back to 500 with `messages[500]` or a generic message.
 */
export function throwApiError(
  apiError: { status: number } | null | undefined,
  messages: Partial<Record<number, string>> = {}
): never {
  const status = (apiError?.status as number) ?? 500;
  const byStatus: Record<number, string> = { 403: 'Permission denied', ...messages };
  const message = byStatus[status] ?? messages[500] ?? 'Something went wrong.';
  const httpStatus = status >= 400 && status <= 599 ? status : 500;
  error(httpStatus as NumericRange<400, 599>, message);
}
