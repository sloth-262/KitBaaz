// Receives the pre-order form, re-checks it, sets the price on the server,
// and forwards the order to the Google Sheet (Apps Script web app).
//
// Works with JavaScript (fetch, JSON reply) and without it (normal form
// post, redirect to the thank-you page or back to the form).

import type { APIRoute } from 'astro';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { findOrderable, orderableProducts } from '../../data/products';
import { site } from '../../data/site';
import { validateOrder, orderTotals, type FieldErrors } from '../../lib/order';
import { claimKey } from '../../lib/claim-key';
import { postToSheet, sheetConfigured, linkSecret, NotConfiguredError } from '../../lib/sheet';

export const prerender = false;

type ErrorCode = 'bad_request' | 'invalid' | 'spam' | 'unavailable' | 'server';

const MESSAGES: Record<ErrorCode, string> = {
  bad_request: 'ফর্মটি পড়া যায়নি। আবার চেষ্টা করুন।',
  invalid: 'কিছু তথ্য ঠিক নেই। লাল চিহ্নিত ঘরগুলো দেখুন।',
  spam: 'যাচাই করা যায়নি। পাতাটি রিফ্রেশ করে আবার চেষ্টা করুন।',
  unavailable: 'এই মুহূর্তে অর্ডার নেওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।',
  server: 'অর্ডারটি জমা দেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।',
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

  const fail = (status: number, code: ErrorCode, fieldErrors?: FieldErrors, kit?: string) => {
    if (wantsJson) {
      return Response.json({ ok: false, error: code, message: MESSAGES[code], fieldErrors }, { status });
    }
    const back = new URLSearchParams({ error: code });
    if (kit) back.set('kit', kit);
    return redirect(`/order/?${back}`);
  };

  let raw: Record<string, unknown>;
  try {
    const type = request.headers.get('content-type') ?? '';
    raw = type.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return fail(400, 'bad_request');
  }

  // Hidden field that people never see; bots tend to fill it in.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') {
    return fail(400, 'spam');
  }

  if (TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(
      TURNSTILE_SECRET_KEY,
      String(raw['cf-turnstile-response'] ?? ''),
      clientAddress,
    );
    if (!passed) return fail(400, 'spam');
  }

  const { input, errors } = validateOrder(raw, orderableProducts().map((p) => p.slug));
  if (Object.keys(errors).length > 0) return fail(422, 'invalid', errors, input.kit);

  const kit = findOrderable(input.kit)!;
  const totals = orderTotals(kit.price, input.quantity, site.advancePercent);

  const order = {
    createdAt: new Date().toISOString(),
    source: kit.testPrice ? 'website-test' : 'website', // test-price orders are easy to spot and delete
    name: input.name,
    phone: input.phone,
    district: input.district,
    address: input.address,
    kit: kit.code,
    kitName: kit.name,
    kitNameBn: kit.nameBn,
    quantity: input.quantity,
    unitPrice: kit.price,
    total: totals.total,
    advance: totals.advance,
    balance: totals.balance,
    payment: input.payment,
    note: input.note,
  };

  let orderId: string;
  try {
    orderId = await saveOrder(order);
  } catch (err) {
    console.error('Order could not be saved', err);
    return fail(err instanceof NotConfiguredError ? 503 : 502, err instanceof NotConfiguredError ? 'unavailable' : 'server');
  }

  const thanks = new URLSearchParams({
    id: orderId,
    k: await claimKey(linkSecret(), orderId), // lets the customer add a TrxID later
    kit: kit.slug,
    qty: String(input.quantity),
    total: String(totals.total),
    advance: String(totals.advance),
    pay: input.payment,
  });

  if (wantsJson) return Response.json({ ok: true, orderId, redirect: `/thanks/?${thanks}` });
  return redirect(`/thanks/?${thanks}`);
};

async function saveOrder(order: Record<string, unknown>): Promise<string> {
  if (!sheetConfigured() && import.meta.env.DEV) {
    // No Sheet connected yet: pretend, so the form can be tested locally.
    const id = `KB-DEV-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    console.log('[dev] Order not sent anywhere (ORDER_WEBHOOK_URL is not set):', id, order);
    return id;
  }
  const data = await postToSheet({ order });
  if (!data.ok || typeof data.orderId !== 'string') {
    throw new Error(`Sheet webhook rejected the order: ${data.error ?? 'no order ID'}`);
  }
  return data.orderId;
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new FormData();
    body.set('secret', secret);
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('Turnstile check failed', err);
    return false;
  }
}

function redirect(location: string) {
  return new Response(null, { status: 303, headers: { location } });
}
