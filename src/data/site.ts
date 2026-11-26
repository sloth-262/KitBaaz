// Business-wide settings. Edit these values; every page reads them.
// Values set to null are not known yet, and the site shows "শীঘ্রই" (coming soon) instead.

export const site = {
  name: 'KitBaaz',
  tagline: 'শিশুদের জন্য রোবোটিক্স ও STEM কিট',

  // TODO(Shakil): confirm contact details.
  phone: null as string | null, // e.g. '01XXXXXXXXX'
  whatsapp: null as string | null, // international format without +, e.g. '8801XXXXXXXXX'
  messengerUsername: null as string | null, // the part after m.me/
  facebookUrl: null as string | null,
  email: null as string | null,

  // Pre-order terms shown across the site.
  advancePercent: 50,
  deliveryDays: { min: 10, max: 14 },

  // Where customers send the advance. Shown on the thank-you page.
  // TODO(Shakil): confirm methods and fill in the numbers / bank details.
  payments: {
    bkash: { labelBn: 'বিকাশ', number: null as string | null, howBn: 'Send Money' },
    nagad: { labelBn: 'নগদ', number: null as string | null, howBn: 'Send Money' },
    bank: { labelBn: 'ব্যাংক ট্রান্সফার', number: null as string | null, howBn: '' },
  },

  // Shows the pre-order buttons on the landing and product pages.
  // Turn on once at least one kit has a price.
  preorderOpen: false,
};

export const paymentLabelsBn = () => Object.values(site.payments).map((p) => p.labelBn);

export const whatsappLink = (text?: string) =>
  site.whatsapp
    ? `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    : null;

export const messengerLink = () =>
  site.messengerUsername ? `https://m.me/${site.messengerUsername}` : null;
