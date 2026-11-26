// Customer says "I paid the advance" from the thank-you page: records the TrxID
// and the number they paid from on their order row. Never changes the status;
// Shakil checks the TrxID in the bKash / Nagad app and confirms it himself.

import type { APIRoute } from 'astro';
import { validatePaymentClaim, ORDER_ID_PATTERN, type ClaimErrors } from '../../lib/order';
import { claimKeyMatches } from '../../lib/claim-key';
import { postToSheet, sheetConfigured, linkSecret, NotConfiguredError } from '../../lib/sheet';

export const prerender = false;

type ErrorCode = 'bad_request' | 'invalid' | 'bad_link' | 'not_found' | 'cancelled' | 'server';

const MESSAGES: Record<ErrorCode, string> = {
  bad_request: 'তথ্যটি পড়া যায়নি। আবার চেষ্টা করুন।',
  invalid: 'কিছু তথ্য ঠিক নেই। লাল চিহ্নিত ঘরগুলো দেখুন।',
  bad_link: 'এই লিংক থেকে পেমেন্টের তথ্য দেওয়া যাচ্ছে না। TrxID আমাদের WhatsApp বা ফোনে জানান।',
  not_found: 'অর্ডারটি খুঁজে পাওয়া যায়নি। TrxID আমাদের WhatsApp বা ফোনে জানান।',
  cancelled: 'এই অর্ডারটি বাতিল করা হয়েছে। প্রশ্ন থাকলে আমাদের জানান।',
  server: 'তথ্যটি জমা দেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা TrxID আমাদের WhatsApp বা ফোনে জানান।',
};

const SHEET_ERRORS: Record<string, ErrorCode> = { not_found: 'not_found', cancelled: 'cancelled' };

export const POST: APIRoute = async ({ request }) => {
  const fail = (status: number, code: ErrorCode, fieldErrors?: ClaimErrors) =>
    Response.json({ ok: false, error: code, message: MESSAGES[code], fieldErrors }, { status });

  let raw: Record<string, unknown>;
  try {
    const type = request.headers.get('content-type') ?? '';
    raw = type.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return fail(400, 'bad_request');
  }

  if (typeof raw.website === 'string' && raw.website.trim() !== '') return fail(400, 'bad_request');

  const { input, errors } = validatePaymentClaim(raw);
  if (Object.keys(errors).length > 0) return fail(422, 'invalid', errors);

  try {
    if (!ORDER_ID_PATTERN.test(input.orderId) || !(await claimKeyMatches(linkSecret(), input.orderId, input.key))) {
      return fail(403, 'bad_link');
    }

    if (!sheetConfigured() && import.meta.env.DEV) {
      console.log('[dev] Payment claim not sent anywhere (ORDER_WEBHOOK_URL is not set):', input);
      return Response.json({ ok: true });
    }

    const data = await postToSheet({
      action: 'payment',
      payment: { orderId: input.orderId, trxId: input.trxId, paidFrom: input.paidFrom },
    });
    if (!data.ok) {
      const code = SHEET_ERRORS[String(data.error)];
      if (code) return fail(code === 'not_found' ? 404 : 409, code);
      throw new Error(`Sheet webhook rejected the payment claim: ${data.error}`);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Payment claim could not be saved', err);
    return fail(err instanceof NotConfiguredError ? 503 : 502, 'server');
  }
};
