// Kit catalogue. For now this is a local file; later it is read from the
// "Products" tab of the KitBaaz Google Sheet when the site is built.

export type Product = {
  slug: string; // used in the page address: /kits/<slug>
  code: string; // supplier model code
  name: string; // English name
  nameBn: string; // Bangla name shown on the site
  summaryBn: string;
  ageMin: number;
  price: number | null; // in Tk; null = not announced yet
  inTheBoxBn: string[]; // empty = not confirmed yet
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
    active: true,
  },
];

export const activeProducts = () => products.filter((p) => p.active);
