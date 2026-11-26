// Talks to the Google Sheet's Apps Script web app. Server-only.

import { ORDER_WEBHOOK_URL, ORDER_WEBHOOK_SECRET } from 'astro:env/server';

export class NotConfiguredError extends Error {}

export type SheetReply = { ok?: boolean; error?: string; [key: string]: unknown };

// The secret that signs thank-you page links. Locally, without a Sheet, a fixed
// dev value is used so the whole flow can still be tried.
export function linkSecret(): string {
  if (ORDER_WEBHOOK_SECRET) return ORDER_WEBHOOK_SECRET;
  if (import.meta.env.DEV) return 'dev-only-secret';
  throw new NotConfiguredError('ORDER_WEBHOOK_SECRET is not set');
}

export const sheetConfigured = () => Boolean(ORDER_WEBHOOK_URL);

// Sends { secret, ...body } to the web app and returns its JSON reply.
// Throws if the web app is not set up, unreachable, or answers with an error.
export async function postToSheet(body: Record<string, unknown>): Promise<SheetReply> {
  if (!ORDER_WEBHOOK_URL) throw new NotConfiguredError('ORDER_WEBHOOK_URL is not set');

  const res = await fetch(ORDER_WEBHOOK_URL, {
    method: 'POST',
    // text/plain keeps Apps Script happy; the body is still JSON.
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: ORDER_WEBHOOK_SECRET ?? '', ...body }),
    redirect: 'follow', // Apps Script answers through a redirect
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let data: SheetReply;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Sheet webhook returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Sheet webhook HTTP ${res.status}: ${data.error ?? ''}`);
  return data;
}
