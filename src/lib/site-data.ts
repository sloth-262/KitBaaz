// What the website reads from the Google Sheet: kit prices (Prices tab) and
// payment details (Settings tab). Server-only.
//
// The Sheet is slow (1–3 s) and has daily limits, so the last copy is kept in
// memory and in Cloudflare KV (SITE_CACHE). A copy older than FRESH_MS is still
// served at once while a fresh one is fetched in the background, so a price
// changed in the Sheet shows on the site within a few minutes.

import { env, waitUntil } from 'cloudflare:workers';
import { postToSheet, sheetConfigured } from './sheet';
import { products } from '../data/products';

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
export type Prices = Record<string, number>; // kit code -> price in Tk

export type SiteData = { payments: PaymentInfo | null; prices: Prices };

const KEY = 'site-data-v1';
// 3 minutes keeps KV writes under the free plan's 1,000 a day even with steady traffic.
const FRESH_MS = 3 * 60 * 1000;
const RETRY_MS = 60 * 1000; // after a failed read with nothing stored

type Entry = { at: number; data: SiteData };
let memory: Entry | null = null;
let refreshing: Promise<Entry | null> | null = null;

const EMPTY: SiteData = { payments: null, prices: {} };

export async function getSiteData(): Promise<SiteData> {
  if (!sheetConfigured()) return EMPTY; // local development without a Sheet
  if (memory && fresh(memory)) return memory.data;

  const stored = await readKv();
  if (stored && (!memory || stored.at > memory.at)) memory = stored;
  if (memory) {
    if (!fresh(memory)) waitUntil(refresh().then(() => undefined));
    return memory.data;
  }
  // Nothing stored yet (first visit after a deploy): wait for the Sheet once.
  return (await refresh())?.data ?? EMPTY;
}

export const getPrices = async () => (await getSiteData()).prices;

const fresh = (e: Entry) => Date.now() - e.at < FRESH_MS;

function refresh(): Promise<Entry | null> {
  refreshing ??= (async () => {
    try {
      const reply = await postToSheet({
        action: 'siteData',
        // Lets the Sheet add a Prices row for any kit it does not list yet.
        kits: products.filter((p) => p.active).map((p) => ({ code: p.code, name: p.name })),
      });
      if (!reply.ok) throw new Error(`Sheet rejected siteData: ${reply.error}`);
      const entry: Entry = { at: Date.now(), data: { payments: parsePayments(reply.payments), prices: parsePrices(reply.prices) } };
      memory = entry;
      await env.SITE_CACHE.put(KEY, JSON.stringify(entry)).catch((err) => console.error('KV write failed', err));
      return entry;
    } catch (err) {
      console.error('Could not read prices and payment details from the Sheet', err);
      // Keep the last good copy. With none, remember the failure for RETRY_MS so
      // every page does not wait for the Sheet again.
      memory ??= { at: Date.now() - FRESH_MS + RETRY_MS, data: EMPTY };
      return memory;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function readKv(): Promise<Entry | null> {
  try {
    const e = await env.SITE_CACHE.get<Entry>(KEY, 'json');
    return e && typeof e.at === 'number' && e.data ? e : null;
  } catch (err) {
    console.error('KV read failed', err);
    return null;
  }
}

function parsePrices(raw: unknown): Prices {
  const out: Prices = {};
  if (raw && typeof raw === 'object') {
    for (const [code, v] of Object.entries(raw)) {
      if (Number.isInteger(v) && (v as number) > 0) out[code.toUpperCase()] = v as number;
    }
  }
  return out;
}

const parsePayments = (raw: unknown): PaymentInfo | null =>
  raw && typeof raw === 'object' && 'bank' in raw ? (raw as PaymentInfo) : null;
