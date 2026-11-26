// Helpers for showing numbers in Bangla digits.

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBnDigits = (value: number | string) =>
  String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

// 4500 -> "৳ ৪,৫০০"
export const formatTk = (amount: number) =>
  `৳ ${toBnDigits(Math.round(amount).toLocaleString('en-IN'))}`;
