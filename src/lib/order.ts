// Order rules shared by the browser (instant error messages) and the
// server (/api/order, which re-checks everything and sets the price).

import { toBnDigits } from './bn';

export const PAYMENT_METHODS = ['bkash', 'nagad', 'bank'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MAX_QUANTITY = 5;

export type OrderInput = {
  name: string;
  phone: string;
  district: string;
  address: string;
  kit: string;
  quantity: number;
  payment: PaymentMethod;
  note: string;
};

export type FieldErrors = Partial<Record<keyof OrderInput, string>>;

const BN_TO_EN: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export const toEnDigits = (s: string) => s.replace(/[০-৯]/g, (d) => BN_TO_EN[d]);

// Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, with spaces or dashes,
// in English or Bangla digits. Returns 01XXXXXXXXX, or null if invalid.
export function normalizePhone(raw: string): string | null {
  let digits = toEnDigits(raw).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('880')) digits = '0' + digits.slice(3);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

// Reads raw form values, returns cleaned input and Bangla error messages.
export function validateOrder(
  raw: Record<string, unknown>,
  orderableKits: string[],
): { input: OrderInput; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const name = clean(raw.name, 80);
  if (name.length < 2) errors.name = 'আপনার নাম লিখুন।';

  const phoneRaw = clean(raw.phone, 30);
  const phone = normalizePhone(phoneRaw);
  if (!phone) errors.phone = 'সঠিক মোবাইল নম্বর লিখুন, যেমন ০১৭১২৩৪৫৬৭৮।';

  const district = clean(raw.district, 40);
  if (district.length < 2) errors.district = 'জেলার নাম লিখুন।';

  const address = clean(raw.address, 300);
  if (address.length < 10) errors.address = 'পূর্ণ ঠিকানা লিখুন (বাসা, রোড, এলাকা)।';

  const kit = clean(raw.kit, 40);
  if (!orderableKits.includes(kit)) errors.kit = 'একটি কিট বেছে নিন।';

  const quantity = Number(toEnDigits(String(raw.quantity ?? '')));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    errors.quantity = `পরিমাণ ১ থেকে ${toBnDigits(MAX_QUANTITY)}-এর মধ্যে হতে হবে।`;
  }

  const payment = clean(raw.payment, 10) as PaymentMethod;
  if (!PAYMENT_METHODS.includes(payment)) errors.payment = 'অগ্রিম পেমেন্টের মাধ্যম বেছে নিন।';

  const note = clean(raw.note, 300);

  return {
    input: { name, phone: phone ?? phoneRaw, district, address, kit, quantity, payment, note },
    errors,
  };
}

export function orderTotals(unitPrice: number, quantity: number, advancePercent: number) {
  const total = unitPrice * quantity;
  const advance = Math.ceil((total * advancePercent) / 100);
  return { total, advance, balance: total - advance };
}

/* ---------------- payment claims (thank-you page) ---------------- */

export type PaymentClaim = { orderId: string; key: string; trxId: string; paidFrom: string };
export type ClaimErrors = Partial<Record<'trxId' | 'paidFrom', string>>;

export const ORDER_ID_PATTERN = /^KB-[A-Z0-9-]{4,20}$/;

// bKash and Nagad transaction IDs are 8–10 letters and digits, e.g. 9K3L2M1N0P.
export const normalizeTrxId = (raw: string) => toEnDigits(raw).replace(/[\s\-]/g, '').toUpperCase();

export function validatePaymentClaim(raw: Record<string, unknown>): { input: PaymentClaim; errors: ClaimErrors } {
  const errors: ClaimErrors = {};
  const trxId = normalizeTrxId(clean(raw.trxId, 40));
  if (!/^[A-Z0-9]{6,20}$/.test(trxId)) errors.trxId = 'সঠিক TrxID লিখুন (পেমেন্টের SMS-এ পাবেন)।';
  const paidFromRaw = clean(raw.paidFrom, 30);
  const paidFrom = normalizePhone(paidFromRaw);
  if (!paidFrom) errors.paidFrom = 'যে নম্বর থেকে টাকা পাঠিয়েছেন, সেটি লিখুন।';
  return {
    input: {
      orderId: clean(raw.orderId, 30).toUpperCase(),
      key: clean(raw.key, 40).toLowerCase(),
      trxId,
      paidFrom: paidFrom ?? paidFromRaw,
    },
    errors,
  };
}
