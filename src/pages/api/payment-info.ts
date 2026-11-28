// Where to send the advance, for the thank-you page. The numbers and bank
// details live only in the Sheet's Settings tab; this reads them from there.
// Kept in memory for a few minutes so the Sheet is not asked on every visit.

import type { APIRoute } from 'astro';
import { postToSheet, sheetConfigured } from '../../lib/sheet';

export const prerender = false;

export type WalletInfo = { number: string | null };
export type BankInfo = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  branch: string | null;
  routing: string | null;
  cardNumber: string | null;
};
export type PaymentInfo = { bkash: WalletInfo; nagad: WalletInfo; rocket: WalletInfo; bank: BankInfo };

const CACHE_MS = 5 * 60 * 1000;
let cached: { at: number; payments: PaymentInfo } | null = null;

export const GET: APIRoute = async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return reply(cached.payments);

  if (!sheetConfigured() && import.meta.env.DEV) {
    return reply(null); // no Sheet locally: the page falls back to "we will call you"
  }

  try {
    const data = await postToSheet({ action: 'paymentInfo' });
    if (!data.ok || typeof data.payments !== 'object' || data.payments === null) {
      throw new Error(`Sheet webhook rejected paymentInfo: ${data.error}`);
    }
    cached = { at: Date.now(), payments: data.payments as PaymentInfo };
    return reply(cached.payments);
  } catch (err) {
    console.error('Payment details could not be read from the Sheet', err);
    if (cached) return reply(cached.payments); // an older copy beats nothing
    return Response.json({ ok: false }, { status: 502 });
  }
};

const reply = (payments: PaymentInfo | null) =>
  Response.json({ ok: true, payments }, { headers: { 'cache-control': 'no-store' } });
