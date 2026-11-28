// Where to send the advance, for the thank-you page. The numbers and bank
// details live only in the Sheet's Settings tab; src/lib/site-data.ts reads
// and caches them.

import type { APIRoute } from 'astro';
import { getSiteData } from '../../lib/site-data';

export const prerender = false;

export const GET: APIRoute = async () => {
  const { payments } = await getSiteData();
  // payments = null: no Sheet or not reachable yet; the page says "we will call you".
  return Response.json({ ok: true, payments }, { headers: { 'cache-control': 'no-store' } });
};
