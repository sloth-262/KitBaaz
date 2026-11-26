// Kit catalogue. For now this is a local file; later it is read from the
// "Products" tab of the KitBaaz Google Sheet when the site is built.

import { site } from './site';

export type Product = {
  slug: string; // used in the page address: /kits/<slug>
  code: string; // supplier model code
  name: string; // English name
  nameBn: string; // Bangla name shown on the site
  summaryBn: string;
  ageMin: number;
  price: number | null; // in Tk; null = not announced yet
  inTheBoxBn: string[]; // empty = not confirmed yet
  learnBn: string[]; // what children learn with this kit
  active: boolean; // false hides the kit from the site
};

export const products: Product[] = [
  {
    slug: 'qe001',
    code: 'QE001',
    name: 'ACEBOTT Smart Home Kit',
    nameBn: 'স্মার্ট হোম কিট',
    summaryBn:
      'নিজের হাতে একটি স্মার্ট বাড়ির মডেল বানিয়ে সেন্সর, ইলেকট্রনিক্স আর কোডিংয়ের প্রথম পাঠ।',
    ageMin: 8,
    price: null, // TODO(Shakil): confirm price
    inTheBoxBn: [], // TODO(Shakil): confirm box contents
    // TODO(Shakil): confirm these match the kit
    learnBn: [
      'ইলেকট্রনিক সার্কিট কীভাবে কাজ করে',
      'সেন্সর দিয়ে আলো, তাপ বা নড়াচড়া বোঝা',
      'ধাপে ধাপে মডেল বানানো ও সমস্যা সমাধান',
      'কোডিংয়ের প্রাথমিক ধারণা',
    ],
    active: true,
  },
];

export const activeProducts = () => products.filter((p) => p.active);

// Kits without a price use this test price so the order form can be tried end
// to end: always during local development (npm run dev), and on the live site
// while site.testPrices is true.
export const TEST_PRICE = 4500;

const testPricesOn = () => import.meta.env.DEV || site.testPrices;

export type OrderableProduct = Product & { price: number; testPrice: boolean };

// Kits a customer can pre-order right now: active and with a price.
export const orderableProducts = (): OrderableProduct[] =>
  activeProducts().flatMap((p): OrderableProduct[] => {
    if (p.price !== null) return [{ ...p, price: p.price, testPrice: false }];
    if (testPricesOn()) return [{ ...p, price: TEST_PRICE, testPrice: true }];
    return [];
  });

export const findOrderable = (slug: string) => orderableProducts().find((p) => p.slug === slug);

export const advanceAmount = (price: number, percent: number) =>
  Math.ceil((price * percent) / 100);
