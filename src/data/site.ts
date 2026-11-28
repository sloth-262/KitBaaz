// Business-wide settings. Edit these values; every page reads them.
// Values set to null are not known yet, and the site shows "শীঘ্রই" (coming soon) instead.

export const site = {
  name: 'KitBaaz',
  tagline: 'সবার জন্য রোবোটিক্স',

  // TODO(Shakil): confirm contact details.
  phone: null as string | null, // e.g. '01XXXXXXXXX'
  whatsapp: '8801402329251' as string | null, // international format without +, e.g. '8801XXXXXXXXX'
  messengerUsername: null as string | null, // the part after m.me/
  facebookUrl: null as string | null,
  email: null as string | null,

  // Pre-order terms shown across the site.
  advancePercent: 50,
  deliveryDays: { min: 10, max: 14 },

  // Ways to pay the advance. The numbers and bank details are NOT here: they
  // are kept only in the Sheet's Settings tab, and the thank-you page reads
  // them from there (/api/payment-info, src/lib/site-data.ts). Kit prices work
  // the same way, from the Sheet's Prices tab.
  payments: {
    bkash: { labelBn: 'বিকাশ', howBn: 'Send Money' },
    nagad: { labelBn: 'নগদ', howBn: 'Send Money' },
    rocket: { labelBn: 'রকেট', howBn: 'Send Money' },
    bank: { labelBn: 'ব্যাংক ট্রান্সফার', howBn: '' },
  },

  // Shows the pre-order buttons on the landing and product pages.
  preorderOpen: true,

  // While true, kits without a price use the test price (products.ts, TEST_PRICE)
  // on the live site too, with a "test price, don't send money" notice, and their
  // orders are marked "website-test" in the Sheet's Source column.
  // TODO: set to false once Shakil confirms the real prices.
  testPrices: true,
};

export const paymentLabelsBn = () => Object.values(site.payments).map((p) => p.labelBn);

export const whatsappLink = (text?: string) =>
  site.whatsapp
    ? `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    : null;

export const messengerLink = () =>
  site.messengerUsername ? `https://m.me/${site.messengerUsername}` : null;
