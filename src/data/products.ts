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
  specsBn: string[]; // board, coding, tutorial facts; empty = section hidden
  active: boolean; // false hides the kit from the site
};

export const products: Product[] = [
  {
    slug: 'qe001',
    code: 'QE001',
    name: 'ACEBOTT Smart Home Kit',
    nameBn: 'স্মার্ট হোম কিট',
    // Text below is based on the ACEBOTT catalog V2.0 and product data sheet.
    summaryBn:
      'কাঠের একটি স্মার্ট বাড়ি নিজের হাতে বানিয়ে রং করা, তারপর কোড লিখে সেটিকে ভয়েস কমান্ড, মোবাইল অ্যাপ আর ওয়েব পেজ দিয়ে চালানো।',
    // The catalog says 10+, the product sheet says 8+. Chosen: 8+.
    ageMin: 8,
    price: null, // TODO(Shakil): confirm price
    inTheBoxBn: [], // TODO(Shakil): confirm box contents
    // TODO(Shakil): confirm these match the kit
    learnBn: [
      'ভয়েস কমান্ড চিনে বাড়ির জিনিস চালানো (স্পিচ রিকগনিশন)',
      'রঙিন RGB আলো আর লেজার প্রজেকশন নিয়ন্ত্রণ',
      'Wi-Fi দিয়ে মোবাইল অ্যাপ ও ওয়েব পেজ থেকে বাড়ি চালানো (IoT)',
      'ব্লক জুড়ে কোডিং শুরু, পরে Arduino ও Python',
      'ধাপে ধাপে মডেল বানানো ও সমস্যা সমাধান',
    ],
    // TODO(Shakil): confirm
    specsBn: [
      'কন্ট্রোলার বোর্ড: ESP32 (Wi-Fi + Bluetooth)',
      'কোডিং: ACECode (ব্লক কোডিং), Arduino, Python',
      'টিউটোরিয়াল: গল্পভিত্তিক ১৬টি অ্যাডভেঞ্চার মিশন, সাথে অ্যাপ',
      'Easy-Plug মডিউল: প্লাগ করেই সহজে লাগানো যায়',
      'নিজের মতো রং করার জন্য কাঠের বাড়ি',
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
