// Kit catalogue. Text is based on the ACEBOTT catalog V2.0 (2026-08-15) and the
// ACEBOTT product data sheet. Supplier prices are deliberately NOT copied here:
// the taka price is Shakil's decision, and he types it in the Sheet's Prices tab.
// TODO(Shakil): confirm box contents and which kits to sell.

import { site } from './site';

export type Series = 'explorer' | 'microbit' | 'inventor' | 'maker' | 'education';

export type Product = {
  slug: string; // used in the page address: /kits/<slug>
  code: string; // supplier model code
  name: string; // English name
  nameBn: string; // Bangla name shown on the site
  series: Series;
  kind: 'kit' | 'expansion' | 'accessory'; // expansion / accessory = needs another kit
  requiresBn?: string; // what the customer also needs, for expansions and accessories
  summaryBn: string;
  ageMin: number | null; // null = not stated by the supplier
  price: number | null; // in Tk; null = not announced yet
  allowTestPrice?: boolean; // may use TEST_PRICE while site.testPrices is on
  image?: string; // e.g. '/kits/qe001.jpg' in public/; only once Shakil has written permission
  inTheBoxBn: string[]; // empty = not confirmed yet
  learnBn: string[]; // what children do and learn with this kit
  specsBn: string[]; // board, coding, tutorial facts; empty = section hidden
  active: boolean; // false hides the kit from the site
};

export const SERIES: { id: Series; nameBn: string; leadBn: string }[] = [
  {
    id: 'explorer',
    nameBn: 'এক্সপ্লোরার সিরিজ',
    leadBn: 'গল্পের মতো মিশনে শেখা: স্মার্ট কার, স্মার্ট হোম, খামার আর আবহাওয়া স্টেশন।',
  },
  { id: 'microbit', nameBn: 'micro:bit কিট', leadBn: 'micro:bit বোর্ড দিয়ে কোডিংয়ের সহজ শুরু।' },
  {
    id: 'inventor',
    nameBn: 'ইনভেন্টর সিরিজ',
    leadBn: 'রোবট বানিয়ে চালানো: মাকড়সা রোবট, হাঁটা রোবট, রোবট আর্ম আর AI রোবট।',
  },
  {
    id: 'maker',
    nameBn: 'মেকার সিরিজ',
    leadBn: 'ইলেকট্রনিক্স ও প্রোগ্রামিংয়ের মজবুত ভিত্তি গড়ার কিট।',
  },
  {
    id: 'education',
    nameBn: 'স্কুলের জন্য এডুকেশন সিরিজ',
    leadBn: 'ক্লাসে পড়ানোর জন্য: টেক্সটবুক আর টিচিং স্লাইডসহ ধাপে ধাপে পাঠ।',
  },
];

/* ---------------- shared wording ---------------- */

const BOARD = {
  esp32: 'কন্ট্রোলার বোর্ড: ESP32 (Wi-Fi + Bluetooth)',
  esp32s3: 'কন্ট্রোলার বোর্ড: ESP32-S3',
  esp8266: 'কন্ট্রোলার বোর্ড: ESP8266',
  microbit: 'কন্ট্রোলার বোর্ড: micro:bit',
  unoR4: 'কন্ট্রোলার বোর্ড: Arduino UNO R4 WiFi',
};
const CODING = {
  full: 'কোডিং: ACECode (ব্লক কোডিং), Arduino, Python',
  school: 'কোডিং: ACECode (ব্লক কোডিং), Arduino',
  microbit: 'কোডিং: MakeCode (ব্লক কোডিং), Python',
};
const lessons = (n: string, extra = '') => `টিউটোরিয়াল: ${n}টি লেসন${extra}`;
const SCHOOL_LESSONS = lessons('১৬', ' (প্রতিটি ৯০ মিনিট), সাথে টেক্সটবুক ও টিচিং স্লাইড (PPT)');
const YEAR_LESSONS = lessons('৩২', ' (প্রতিটি ৯০ মিনিট), সাথে টেক্সটবুক ও টিচিং স্লাইড (PPT)');
const SCHOOL_EXTRAS = [
  'বাস্তব জীবনের সমস্যার সমাধান নিয়ে প্রজেক্ট',
  'সরাসরি চার্জ করা যায়, ব্যাটারি বদলাতে হয় না',
  'App Inventor দিয়ে নিজের মোবাইল অ্যাপ বানানো',
];
const NO_MAP = 'স্যান্ডবক্স ম্যাপ এই কিটে নেই, আলাদা কিনতে হয়';
const oneBoard = (n: string) =>
  `${n}-ইন-১ কিট: কন্ট্রোলার বোর্ড একটি, তাই একবারে একটি প্রজেক্ট বানানো যায়`;
const NEEDS_QD001 = 'QD001 স্মার্ট কার স্টার্টার কিট লাগবে (এটি তার এক্সপ্যানশন প্যাক)।';
const NEEDS_TINKERBOTT = 'QD024 বা QD025 টিংকারবট কার লাগবে।';

// Most products: active, no price yet, box contents not confirmed.
const kit = (
  p: Omit<Product, 'slug' | 'price' | 'active' | 'inTheBoxBn' | 'kind'> &
    Partial<Pick<Product, 'price' | 'active' | 'inTheBoxBn' | 'kind'>>,
): Product => ({
  slug: p.code.toLowerCase(),
  price: null,
  active: true,
  inTheBoxBn: [],
  kind: 'kit',
  ...p,
});

export const products: Product[] = [
  /* ---------------- Explorer series ---------------- */
  kit({
    code: 'QE001',
    name: 'ACEBOTT Smart Home Kit',
    nameBn: 'স্মার্ট হোম কিট',
    series: 'explorer',
    summaryBn:
      'কাঠের একটি স্মার্ট বাড়ি নিজের হাতে বানিয়ে রং করা, তারপর কোড লিখে সেটিকে ভয়েস কমান্ড, মোবাইল অ্যাপ আর ওয়েব পেজ দিয়ে চালানো।',
    // The catalog says 10+, the product sheet says 8+. Chosen: 8+.
    ageMin: 8,
    allowTestPrice: true,
    learnBn: [
      'ভয়েস কমান্ড চিনে বাড়ির জিনিস চালানো (স্পিচ রিকগনিশন)',
      'রঙিন RGB আলো আর লেজার প্রজেকশন নিয়ন্ত্রণ',
      'Wi-Fi দিয়ে মোবাইল অ্যাপ ও ওয়েব পেজ থেকে বাড়ি চালানো (IoT)',
      'ব্লক জুড়ে কোডিং শুরু, পরে Arduino ও Python',
      'ধাপে ধাপে মডেল বানানো ও সমস্যা সমাধান',
    ],
    specsBn: [
      BOARD.esp32,
      CODING.full,
      'টিউটোরিয়াল: গল্পভিত্তিক ১৬টি অ্যাডভেঞ্চার মিশন, সাথে অ্যাপ',
      'Easy-Plug মডিউল: প্লাগ করেই সহজে লাগানো যায়',
      'নিজের মতো রং করার জন্য কাঠের বাড়ি',
    ],
  }),
  kit({
    code: 'QE005',
    name: 'ACEBOTT Smart Home Kit for micro:bit (with micro:bit)',
    nameBn: 'স্মার্ট হোম কিট (micro:bit-সহ)',
    series: 'explorer',
    summaryBn: 'micro:bit দিয়ে চলা কাঠের স্মার্ট বাড়ি। বোর্ড বক্সেই আছে, Bluetooth-এ অ্যাপ দিয়ে চালানো যায়।',
    ageMin: 10,
    learnBn: [
      'ভয়েস কমান্ড চিনে বাড়ির জিনিস চালানো',
      'রঙিন RGB আলো আর লেজার প্রজেকশন নিয়ন্ত্রণ',
      'Bluetooth দিয়ে মোবাইল অ্যাপ থেকে বাড়ি চালানো',
      'MakeCode-এ ব্লক জুড়ে কোডিং, পরে Python',
    ],
    specsBn: [
      BOARD.microbit + ' (বক্সে আছে)',
      'কোডিং: ACECode, MakeCode, Python',
      'টিউটোরিয়াল: গল্পভিত্তিক অ্যাডভেঞ্চার মিশন, সাথে অ্যাপ',
      'নিজের মতো রং করার জন্য কাঠের বাড়ি',
    ],
  }),
  kit({
    code: 'QE006',
    name: 'ACEBOTT Smart Home Kit for micro:bit (without micro:bit)',
    nameBn: 'স্মার্ট হোম কিট (micro:bit ছাড়া)',
    series: 'explorer',
    summaryBn: 'QE005-এর মতোই কাঠের স্মার্ট বাড়ি, তবে micro:bit বোর্ড নেই। যাদের কাছে আগে থেকে micro:bit আছে তাদের জন্য।',
    ageMin: 10,
    requiresBn: 'একটি micro:bit বোর্ড লাগবে (বক্সে নেই)।',
    learnBn: [
      'ভয়েস কমান্ড চিনে বাড়ির জিনিস চালানো',
      'রঙিন RGB আলো আর লেজার প্রজেকশন নিয়ন্ত্রণ',
      'Bluetooth দিয়ে মোবাইল অ্যাপ থেকে বাড়ি চালানো',
      'MakeCode-এ ব্লক জুড়ে কোডিং, পরে Python',
    ],
    specsBn: [
      BOARD.microbit + ' (বক্সে নেই)',
      'কোডিং: ACECode, MakeCode, Python',
      'টিউটোরিয়াল: গল্পভিত্তিক অ্যাডভেঞ্চার মিশন, সাথে অ্যাপ',
      'নিজের মতো রং করার জন্য কাঠের বাড়ি',
    ],
  }),
  kit({
    code: 'QE002',
    name: 'ACEBOTT Smart Farm Kit',
    nameBn: 'স্মার্ট ফার্ম কিট',
    series: 'explorer',
    summaryBn: 'বায়ুকল আর গাছসহ কাঠের একটি খামার বানিয়ে সৌরশক্তি, চাষাবাদ আর IoT নিয়ে হাতে-কলমে শেখা।',
    ageMin: 10,
    learnBn: [
      'সোলার প্যানেলে বিদ্যুৎ তৈরি',
      'খামারে চাষাবাদের মডেল',
      'পোষা প্রাণীকে স্বয়ংক্রিয়ভাবে খাবার দেওয়া',
      'ওয়েব পেজ ও মোবাইল অ্যাপ থেকে খামার চালানো',
    ],
    specsBn: [
      BOARD.esp32,
      CODING.full,
      'টিউটোরিয়াল: গল্পভিত্তিক ১৬টি অ্যাডভেঞ্চার মিশন, সাথে অ্যাপ',
      'Easy-Plug মডিউল, রং করার জন্য কাঠের মডেল',
    ],
  }),
  kit({
    code: 'QE011',
    name: 'ACEBOTT IoT Weather Station Kit',
    nameBn: 'আবহাওয়া স্টেশন কিট',
    series: 'explorer',
    summaryBn: 'নিজের আবহাওয়া স্টেশন বানিয়ে বাতাস, বৃষ্টি, তাপমাত্রা, ধুলাবালিসহ ৯ ধরনের তথ্য মাপা আর মোবাইলে দেখা।',
    ageMin: 10,
    inTheBoxBn: [
      'বাতাসের গতি মাপার সেন্সর (অ্যানিমোমিটার)',
      'PM2.5 (ধুলাবালি) সেন্সর',
      'UV (অতিবেগুনি রশ্মি) সেন্সর',
      'OLED ডিসপ্লে মডিউল',
      'সোলার চার্জিং প্যানেল ও চার্জিং মডিউল',
      'বায়ুচাপ সেন্সর',
      'কম্পন সেন্সর',
      'DHT11 তাপমাত্রা ও আর্দ্রতা সেন্সর',
      'বৃষ্টির ফোঁটা সেন্সর',
    ],
    learnBn: [
      '৯ ধরনের আবহাওয়ার তথ্য মাপা',
      'সৌরশক্তিতে চার্জ হওয়া যন্ত্র',
      'ওয়েব পেজ ও মোবাইল অ্যাপে তথ্য দেখা (IoT)',
      'সেন্সরের তথ্য নিয়ে কোড লেখা',
    ],
    specsBn: [
      BOARD.esp32,
      CODING.full,
      'টিউটোরিয়াল: গল্পভিত্তিক ১৬টি অ্যাডভেঞ্চার মিশন',
      'IPX2 মানের পানিরোধী',
    ],
  }),
  kit({
    code: 'QD001',
    name: 'ACEBOTT ESP32 Smart Car Starter Kit (4WD Mecanum Wheel)',
    nameBn: 'স্মার্ট কার স্টার্টার কিট',
    series: 'explorer',
    summaryBn:
      'চার চাকার মেকানাম হুইলের স্মার্ট কার, যেকোনো দিকে চলতে পারে। এক্সপ্যানশন প্যাক লাগিয়ে ক্যামেরা কার, ট্যাংক, রোবট আর্ম কারসহ নানা গাড়ি বানানো যায়।',
    ageMin: null,
    learnBn: [
      'মেকানাম হুইলে সামনে-পেছনে, পাশে ও কোনাকুনি চলা',
      'লাইন ট্র্যাকিং সেন্সর দিয়ে পথ ধরে চলা',
      'IR রিমোট দিয়ে গাড়ি চালানো',
      'LED আর সার্ভো মোটর নিয়ন্ত্রণ',
    ],
    specsBn: [
      BOARD.esp32,
      'মডিউল: কার প্ল্যাটফর্ম, মেকানাম হুইল, LED, ট্রেস সেন্সর, IR রিমোট, সার্ভো',
      'নিচের এক্সপ্যানশন প্যাকগুলো এই কারের সাথেই লাগে',
    ],
  }),
  kit({
    code: 'QD002',
    name: 'ACEBOTT ESP32 Camera Expansion Pack for QD001',
    nameBn: 'ক্যামেরা এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারে ক্যামেরা লাগিয়ে ক্যামেরা কার বানানো।',
    ageMin: null,
    learnBn: ['গাড়িতে ক্যামেরা লাগানো', 'ক্যামেরার ছবি দেখে গাড়ি চালানো'],
    specsBn: ['QD001 + QD002 = ক্যামেরা কার'],
  }),
  kit({
    code: 'QD003',
    name: 'ACEBOTT AI Vision Expansion Pack for QD001',
    nameBn: 'AI ভিশন এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারকে চোখ দেওয়া: AI ক্যামেরা দিয়ে জিনিস চিনতে পারা AI ভিশন কার।',
    ageMin: null,
    learnBn: ['AI ক্যামেরা দিয়ে জিনিস চেনা', 'যা দেখে সেই অনুযায়ী গাড়ি চালানো'],
    specsBn: ['QD001 + QD003 = AI ভিশন কার'],
  }),
  kit({
    code: 'QD004',
    name: 'ACEBOTT ESP32 Tank Robot Car Expansion Pack for QD001',
    nameBn: 'রোবট ট্যাংক এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'চাকার বদলে চেইন ট্র্যাক লাগিয়ে স্মার্ট কারকে রোবট ট্যাংক বানানো।',
    ageMin: null,
    learnBn: ['ট্র্যাক বা চেইন চাকা কীভাবে কাজ করে', 'উঁচুনিচু পথে চলা গাড়ি বানানো'],
    specsBn: ['QD001 + QD004 = রোবট ট্যাংক কার'],
  }),
  kit({
    code: 'QD005',
    name: 'ACEBOTT ESP32 Water Ball Launcher Expansion Pack for QD001',
    nameBn: 'ওয়াটার বল লঞ্চার এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারে পানির বল ছোড়ার যন্ত্র লাগিয়ে খেলা। সুরক্ষা চশমা সাথে আছে।',
    ageMin: null,
    learnBn: ['লক্ষ্য ঠিক করে বল ছোড়ার যন্ত্র', 'দূর থেকে নিয়ন্ত্রণ'],
    specsBn: [
      'QD001 + QD005 = ওয়াটার বল লঞ্চার কার',
      'সাথে সুরক্ষা চশমা',
      'আরও মজার জন্য QD006 স্কোরিং টার্গেট নিতে পারেন',
    ],
  }),
  kit({
    code: 'QD006',
    name: 'ACEBOTT Electric Scoring & Shooting Target for QD005',
    nameBn: 'ইলেকট্রিক স্কোরিং টার্গেট',
    series: 'explorer',
    kind: 'accessory',
    requiresBn: 'QD001 স্মার্ট কার আর QD005 ওয়াটার বল লঞ্চার প্যাক লাগবে।',
    summaryBn: 'ওয়াটার বল লঞ্চার কারের জন্য স্কোর গোনা টার্গেট বোর্ড।',
    ageMin: null,
    learnBn: ['টার্গেটে লাগলে স্বয়ংক্রিয়ভাবে স্কোর গোনা', 'বন্ধুদের সাথে নিশানা খেলা'],
    specsBn: ['QD001 + QD005 + QD006 = ওয়াটার বল লঞ্চার কার ও টার্গেট'],
  }),
  kit({
    code: 'QD007',
    name: 'ACEBOTT ESP32 5-DOF Robot Arm Expansion Pack for QD001',
    nameBn: 'রোবট আর্ম এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারে ৫ জয়েন্টের রোবট হাত লাগিয়ে জিনিস ধরা ও সরানো।',
    ageMin: null,
    learnBn: ['৫ দিকে নড়তে পারা (5-DOF) রোবট হাত', 'গাড়ি চালিয়ে জিনিস তুলে আনা'],
    specsBn: ['QD001 + QD007 = রোবট আর্ম কার'],
  }),
  kit({
    code: 'QD008',
    name: 'ACEBOTT Solar Energy Expansion Pack for QD001',
    nameBn: 'সোলার এনার্জি এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারে সোলার প্যানেল লাগিয়ে সৌরশক্তিতে চলা গাড়ি।',
    ageMin: null,
    learnBn: ['সোলার প্যানেল কীভাবে বিদ্যুৎ বানায়', 'সৌরশক্তিতে গাড়ি চার্জ করা'],
    specsBn: ['QD001 + QD008 = সোলার কার'],
  }),
  kit({
    code: 'QD009',
    name: 'ACEBOTT GPS Expansion Pack for QD001',
    nameBn: 'GPS এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'স্মার্ট কারে GPS লাগিয়ে গাড়ি কোথায় আছে তা জানা।',
    ageMin: null,
    learnBn: ['GPS দিয়ে অবস্থান বের করা', 'ম্যাপে গাড়ির জায়গা দেখা'],
    specsBn: ['QD001 + QD009 = GPS কার', 'সাথে একটি বাটন ব্যাটারি'],
  }),
  kit({
    code: 'QD010',
    name: 'ACEBOTT PS3 Wireless Controller (Handle Expansion Pack) for QD001',
    nameBn: 'PS3 ওয়্যারলেস কন্ট্রোলার',
    series: 'explorer',
    kind: 'accessory',
    requiresBn: NEEDS_QD001,
    summaryBn: 'গেম কন্ট্রোলারের মতো জয়স্টিক দিয়ে স্মার্ট কার চালানো।',
    ageMin: null,
    learnBn: ['ওয়্যারলেস কন্ট্রোলার দিয়ে গাড়ি চালানো'],
    specsBn: ['QD001 + QD010 = কন্ট্রোলারে চলা স্মার্ট কার', 'সাথে রিচার্জেবল লিথিয়াম ব্যাটারি'],
  }),
  kit({
    code: 'QD011',
    name: 'ACEBOTT Voice Control Expansion Pack for QD001',
    nameBn: 'ভয়েস কন্ট্রোল এক্সপ্যানশন প্যাক',
    series: 'explorer',
    kind: 'expansion',
    requiresBn: NEEDS_QD001,
    summaryBn: 'মুখে বলা কমান্ডে স্মার্ট কার চালানো।',
    ageMin: null,
    learnBn: ['ভয়েস কমান্ড চিনে গাড়ি চালানো'],
    specsBn: ['QD001 + QD011 = ভয়েস কন্ট্রোল কার'],
  }),

  /* ---------------- micro:bit ---------------- */
  kit({
    code: 'QD024',
    name: 'ACEBOTT TinkerBott micro:bit Car (with micro:bit)',
    nameBn: 'টিংকারবট micro:bit কার (micro:bit-সহ)',
    series: 'microbit',
    summaryBn: 'micro:bit দিয়ে চলা ছোট্ট রোবট কার। লাইন ধরে চলে, বাধা দেখলে সরে যায়, অ্যাপ দিয়েও চালানো যায়।',
    ageMin: 8,
    learnBn: ['ব্লক জুড়ে কোডিং', 'লাইন ধরে চলা', 'বাধা চিনে এড়িয়ে চলা', 'মোবাইল অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.microbit + ' (বক্সে আছে)', CODING.microbit, lessons('১৬')],
  }),
  kit({
    code: 'QD025',
    name: 'ACEBOTT TinkerBott micro:bit Car (without micro:bit)',
    nameBn: 'টিংকারবট micro:bit কার (micro:bit ছাড়া)',
    series: 'microbit',
    summaryBn: 'QD024-এর মতোই টিংকারবট কার, তবে micro:bit বোর্ড নেই।',
    ageMin: 8,
    requiresBn: 'একটি micro:bit বোর্ড লাগবে (বক্সে নেই)।',
    learnBn: ['ব্লক জুড়ে কোডিং', 'লাইন ধরে চলা', 'বাধা চিনে এড়িয়ে চলা', 'মোবাইল অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.microbit + ' (বক্সে নেই)', CODING.microbit, lessons('১৬')],
  }),
  kit({
    code: 'QD107',
    name: 'ACEBOTT AI Vision Expansion Pack for TinkerBott Car',
    nameBn: 'টিংকারবটের AI ভিশন এক্সপ্যানশন প্যাক',
    series: 'microbit',
    kind: 'expansion',
    requiresBn: NEEDS_TINKERBOTT,
    summaryBn: 'টিংকারবট কারে AI ক্যামেরা লাগিয়ে জিনিস চিনতে শেখানো।',
    ageMin: 8,
    learnBn: ['AI ক্যামেরা দিয়ে জিনিস চেনা', 'যা দেখে সেই অনুযায়ী গাড়ি চালানো'],
    specsBn: ['QD024 + QD107 = AI ভিশন টিংকারবট'],
  }),
  kit({
    code: 'QD108',
    name: 'ACEBOTT Football Arena Kit for TinkerBott Car',
    nameBn: 'টিংকারবটের ফুটবল অ্যারেনা কিট',
    series: 'microbit',
    kind: 'accessory',
    requiresBn: NEEDS_TINKERBOTT,
    summaryBn: 'ফুটবল মাঠের ম্যাপ আর বল ধরার অংশ, টিংকারবট দিয়ে ফুটবল খেলার জন্য।',
    ageMin: 8,
    learnBn: ['রোবট কার দিয়ে বল ঠেলে গোল করা', 'বন্ধুদের সাথে রোবট ফুটবল'],
    specsBn: ['QD024 + QD108 = ফুটবল খেলার টিংকারবট'],
  }),
  kit({
    code: 'QD026',
    name: 'ACEBOTT micro:bit Handle Kit (with micro:bit)',
    nameBn: 'micro:bit কন্ট্রোলার কিট (micro:bit-সহ)',
    series: 'microbit',
    summaryBn: 'জয়স্টিক আর বোতামওয়ালা নিজের গেম কন্ট্রোলার বানিয়ে ওয়্যারলেসে রোবট চালানো।',
    ageMin: 8,
    learnBn: ['ব্লক জুড়ে কোডিং', 'কন্ট্রোলার দিয়ে রোবট চালানো', 'ওয়্যারলেস যোগাযোগ'],
    specsBn: [BOARD.microbit + ' (বক্সে আছে)', CODING.microbit, lessons('৮')],
  }),
  kit({
    code: 'QD027',
    name: 'ACEBOTT micro:bit Handle Kit (without micro:bit)',
    nameBn: 'micro:bit কন্ট্রোলার কিট (micro:bit ছাড়া)',
    series: 'microbit',
    summaryBn: 'QD026-এর মতোই কন্ট্রোলার কিট, তবে micro:bit বোর্ড নেই।',
    ageMin: 8,
    requiresBn: 'একটি micro:bit বোর্ড লাগবে (বক্সে নেই)।',
    learnBn: ['ব্লক জুড়ে কোডিং', 'কন্ট্রোলার দিয়ে রোবট চালানো', 'ওয়্যারলেস যোগাযোগ'],
    specsBn: [BOARD.microbit + ' (বক্সে নেই)', CODING.microbit, lessons('৮')],
  }),

  /* ---------------- Inventor series ---------------- */
  kit({
    code: 'QD020',
    name: 'ACEBOTT ESP8266 Quadruped Bionic Spider Robot Kit',
    nameBn: 'চার পায়ের মাকড়সা রোবট',
    series: 'inventor',
    summaryBn: 'চার পায়ে হাঁটা মাকড়সা রোবট বানিয়ে তাকে নাচানো, হাঁটানো আর নতুন নড়াচড়া শেখানো।',
    ageMin: 10,
    learnBn: ['রোবটের কাঠামো নিজে জোড়া দেওয়া', '৯টি তৈরি নড়াচড়া', 'নিজের মতো নড়াচড়া ডিজাইন', 'ওয়েব পেজ ও অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.esp8266, CODING.full, lessons('৮')],
  }),
  kit({
    code: 'QD021',
    name: 'ACEBOTT Bionic Biped Coding Robot Kit',
    nameBn: 'দুই পায়ের হাঁটা রোবট',
    series: 'inventor',
    summaryBn: 'দুই পায়ে হাঁটা মজার রোবট, মুখোশ বদলে নতুন চরিত্র বানানো যায়।',
    ageMin: 10,
    learnBn: ['৬টি মুখোশে নতুন চরিত্র', '১২টি তৈরি নড়াচড়া', 'নিজের মতো নড়াচড়া ডিজাইন', 'ওয়েব পেজ ও অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৪')],
  }),
  kit({
    code: 'QD022',
    name: 'ACEBOTT ESP32 4-DOF Robot Arm Kit',
    nameBn: 'রোবট আর্ম কিট (৪ জয়েন্ট)',
    series: 'inventor',
    summaryBn: 'জয়স্টিকে চলা রোবট হাত, ছোট জিনিস তুলে এক জায়গা থেকে আরেক জায়গায় রাখে।',
    ageMin: 10,
    learnBn: ['জয়স্টিক দিয়ে নিয়ন্ত্রণ', 'তিন দিকে নড়াচড়া', 'নড়াচড়া মনে রেখে আবার করা (মেমরি)', 'ওয়েব পেজ ও অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৮')],
  }),
  kit({
    code: 'QD023',
    name: 'ACEBOTT Motion-Sensing Glove',
    nameBn: 'মোশন-সেন্সিং গ্লাভস',
    series: 'inventor',
    summaryBn: 'হাতে পরার গ্লাভস, হাতের ইশারা বুঝে রোবট বা গাড়ি চালায়।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', 'হাতের ইশারা চেনা', 'নড়াচড়া ও কাত হওয়া বোঝা (গ্র্যাভিটি সেন্সিং)', 'Bluetooth যোগাযোগ'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৪')],
  }),
  kit({
    code: 'QD028',
    name: 'ACEBOTT BattleBolt Battle Car Kit',
    nameBn: 'ব্যাটলবোল্ট ব্যাটল কার',
    series: 'inventor',
    summaryBn: 'এক কারে দুই মোড: বন্ধুর গাড়ির সাথে লড়াই, নয়তো রোবট ফুটবল।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', 'দুই রকম গাড়ি বানানো (ব্যাটল ও ফুটবল)', 'PS3 কন্ট্রোলার দিয়ে চালানো', 'অ্যাপ দিয়ে চালানো'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৮'), 'খেলার মাঠের জন্য QD109 অ্যারেনা কিট আলাদা'],
  }),
  kit({
    code: 'QD109',
    name: 'ACEBOTT Battle Arena Kit for BattleBolt Car',
    nameBn: 'ব্যাটলবোল্টের অ্যারেনা কিট',
    series: 'inventor',
    kind: 'accessory',
    requiresBn: 'QD028 ব্যাটলবোল্ট ব্যাটল কার লাগবে।',
    summaryBn: 'এক ম্যাপে দুই অ্যারেনা: একদিকে লড়াইয়ের মাঠ, অন্যদিকে ফুটবল মাঠ।',
    ageMin: 10,
    learnBn: ['ব্যাটল মোডে লড়াই', 'ফুটবল মোডে গোল করা'],
    specsBn: ['QD028 + QD109 = ব্যাটল ও ফুটবল অ্যারেনা'],
  }),
  kit({
    code: 'QD029',
    name: 'ACEBOTT LumiBot AI Coding Kit',
    nameBn: 'লুমিবট AI কোডিং রোবট',
    series: 'inventor',
    summaryBn: 'কথা বলা AI রোবট: প্রশ্ন করলে উত্তর দেয়, মুখের কথায় চলে, আর নিজে AI ট্রেনিং দেওয়া যায়।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', 'AI-এর সাথে কথা বলা (LLM ভয়েস চ্যাট)', 'মুখের কথায় রোবট চালানো', 'অ্যাপ দিয়ে দূর থেকে চালানো', 'হাতে-কলমে AI ট্রেনিং'],
    specsBn: [BOARD.esp32s3, CODING.full, lessons('১৬')],
  }),

  /* ---------------- Maker series ---------------- */
  kit({
    code: 'QE200',
    name: 'ACEBOTT ESP32 Basic Starter Kit',
    nameBn: 'ESP32 বেসিক স্টার্টার কিট',
    series: 'maker',
    summaryBn: 'ইলেকট্রনিক্স শেখার শুরুর কিট: ব্রেডবোর্ড, LED, সেন্সর, ডিসপ্লেসহ ২৯ রকমের মডিউল।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', '২৯ রকমের মডিউল দিয়ে সার্কিট বানানো', 'অনেক প্রজেক্টের লাইব্রেরি', 'QE201 কাঠের প্যাক দিয়ে আসল জিনিস বানানো'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৩৭')],
  }),
  kit({
    code: 'QE201',
    name: 'ACEBOTT Wooden Color Board Expansion Pack (for QE200 / QE206)',
    nameBn: 'কাঠের প্রজেক্ট এক্সপ্যানশন প্যাক (QE200 / QE206-এর জন্য)',
    series: 'maker',
    kind: 'expansion',
    requiresBn: 'QE200 ESP32 বেসিক স্টার্টার কিট বা QE206 Arduino UNO R4 WiFi কিট লাগবে।',
    summaryBn: 'রঙিন কাঠের বোর্ড দিয়ে স্টার্টার কিটের সার্কিটকে আসল যন্ত্রে রূপ দেওয়া।',
    ageMin: 10,
    learnBn: ['স্মার্ট ফ্যান', 'স্মার্ট ডাস্টবিন', 'স্মার্ট প্রজাপতি', 'ইলেকট্রনিক পিয়ানো', 'স্মার্ট গেট (বেরিয়ার)'],
    specsBn: ['৫টি কাঠের প্রজেক্ট'],
  }),
  kit({
    code: 'QE202',
    name: 'ACEBOTT ESP32 Advanced Development Kit',
    nameBn: 'ESP32 অ্যাডভান্সড ডেভেলপমেন্ট কিট',
    series: 'maker',
    summaryBn: 'আরও এক ধাপ এগোনো কিট: ২৬ রকমের প্লাগ-ইন মডিউল আর ৪০টির বেশি লেসন।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', '২৬ রকমের মডিউল দিয়ে প্রজেক্ট', 'অনেক প্রজেক্টের লাইব্রেরি', 'QE203 কাঠের প্যাক দিয়ে আসল জিনিস বানানো'],
    specsBn: [BOARD.esp32, CODING.full, lessons('৪০+')],
  }),
  kit({
    code: 'QE203',
    name: 'ACEBOTT ESP32 Advanced Sensor Kit (Wooden Expansion Pack for QE202)',
    nameBn: 'অ্যাডভান্সড কাঠের প্রজেক্ট প্যাক (QE202-এর জন্য)',
    series: 'maker',
    kind: 'expansion',
    requiresBn: 'QE202 ESP32 অ্যাডভান্সড ডেভেলপমেন্ট কিট লাগবে।',
    summaryBn: 'রঙিন কাঠের বোর্ড দিয়ে অ্যাডভান্সড কিটের ৫টি বড় প্রজেক্ট।',
    ageMin: 10,
    learnBn: ['টাওয়ার ক্রেন', 'বাস্কেটবল শুটিং মেশিন', 'ভেন্ডিং মেশিন', 'স্মার্ট অ্যালার্ম ঘড়ি', 'টেলিগ্রাফ ট্রান্সমিটার'],
    specsBn: ['৫টি কাঠের প্রজেক্ট'],
  }),
  kit({
    code: 'QE206',
    name: 'ACEBOTT Arduino UNO R4 WiFi Starter Kit',
    nameBn: 'Arduino UNO R4 WiFi স্টার্টার কিট',
    series: 'maker',
    summaryBn: 'Arduino UNO R4 WiFi বোর্ডসহ ১২০টির বেশি যন্ত্রাংশ, ইলেকট্রনিক্স আর Arduino শেখার জন্য।',
    ageMin: 10,
    learnBn: ['কোড ও ব্লক কোডিং', '১২০টির বেশি যন্ত্রাংশ দিয়ে সার্কিট', 'অনেক প্রজেক্টের লাইব্রেরি', 'QE201 কাঠের প্যাক দিয়ে আসল জিনিস বানানো'],
    specsBn: [BOARD.unoR4, CODING.full, lessons('৪৩')],
  }),

  /* ---------------- Education Solution series ---------------- */
  kit({
    code: 'QE023',
    name: 'ACEBOTT Smart Home Education Kit – Level 1',
    nameBn: 'স্মার্ট হোম এডুকেশন কিট – লেভেল ১',
    series: 'education',
    summaryBn: 'স্কুলের ক্লাসের জন্য স্মার্ট হোম পাঠ: স্মার্ট আলো, বিনোদন আর তাপমাত্রা নিয়ন্ত্রণ।',
    ageMin: 8,
    learnBn: ['স্মার্ট আলো', 'স্মার্ট বিনোদন', 'তাপমাত্রা ও আর্দ্রতা নিয়ন্ত্রণ', ...SCHOOL_EXTRAS],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS, oneBoard('৩'), NO_MAP],
  }),
  kit({
    code: 'QE024',
    name: 'ACEBOTT Smart Home Education Kit – Level 2',
    nameBn: 'স্মার্ট হোম এডুকেশন কিট – লেভেল ২',
    series: 'education',
    summaryBn: 'লেভেল ১-এর পরের ধাপ: পোষা প্রাণীর খাবার, কাপড় শুকানো, নিরাপত্তা, দরজা আর গাছে পানি দেওয়ার স্মার্ট ব্যবস্থা।',
    ageMin: 8,
    learnBn: [
      'স্বয়ংক্রিয় পোষা প্রাণীর খাবার',
      'স্বয়ংক্রিয় কাপড় শুকানোর র‍্যাক',
      'নিরাপত্তা অ্যালার্ম',
      'স্মার্ট দরজা (অ্যাক্সেস কন্ট্রোল)',
      'স্বয়ংক্রিয় গাছে পানি দেওয়া',
      ...SCHOOL_EXTRAS,
    ],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS, oneBoard('৫'), NO_MAP],
  }),
  kit({
    code: 'QE035',
    name: 'ACEBOTT Smart Home Display Kit with Sandbox Map – Year 1',
    nameBn: 'স্মার্ট হোম ডিসপ্লে কিট, স্যান্ডবক্স ম্যাপসহ – বছর ১',
    series: 'education',
    summaryBn: 'স্কুলের এক বছরের পুরো স্মার্ট হোম পাঠ: ৮টি প্রজেক্ট একসাথে সাজিয়ে দেখানোর জন্য ম্যাপ আর ৮টি বোর্ড।',
    ageMin: 8,
    learnBn: [
      'স্মার্ট আলো ও বিনোদন',
      'তাপমাত্রা ও আর্দ্রতা নিয়ন্ত্রণ',
      'স্বয়ংক্রিয় পোষা প্রাণীর খাবার ও কাপড় শুকানো',
      'নিরাপত্তা অ্যালার্ম ও স্মার্ট দরজা',
      'স্বয়ংক্রিয় গাছে পানি দেওয়া',
    ],
    specsBn: [
      'কন্ট্রোলার বোর্ড: ৮টি ESP32 (Wi-Fi + Bluetooth), ৮টি প্রজেক্ট একসাথে চলে',
      CODING.school,
      YEAR_LESSONS,
      'স্যান্ডবক্স ম্যাপ সাথে আছে',
    ],
  }),
  kit({
    code: 'QE027',
    name: 'ACEBOTT Intelligent Transportation Education Kit – Level 1',
    nameBn: 'স্মার্ট ট্রাফিক এডুকেশন কিট – লেভেল ১',
    series: 'education',
    summaryBn: 'স্কুলের ক্লাসের জন্য শহরের স্মার্ট রাস্তা: স্ট্রিট লাইট, ট্রাফিক লাইট, রাস্তা পারাপার আর পার্কিং।',
    ageMin: 9,
    learnBn: ['স্মার্ট স্ট্রিট লাইট', 'স্মার্ট ট্রাফিক লাইট', 'স্মার্ট রাস্তা পারাপার', 'স্মার্ট পার্কিং', ...SCHOOL_EXTRAS],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS, oneBoard('৪'), NO_MAP],
  }),
  kit({
    code: 'QE028',
    name: 'ACEBOTT SharkBot Intelligent Transportation Education Kit – Level 2',
    nameBn: 'শার্কবট স্মার্ট ট্রাফিক এডুকেশন কিট – লেভেল ২',
    series: 'education',
    summaryBn: 'শার্কবট রোবট কার দিয়ে স্বয়ংক্রিয় গাড়ির পাঠ: কথা শুনে চলা, লাইন ধরে চলা, বাধা এড়ানো।',
    ageMin: 9,
    learnBn: ['ভয়েস কমান্ড চেনা', 'গাড়িতে গাড়িতে যোগাযোগ (নেটওয়ার্কিং)', 'এনকোডার মোটর', 'বাধা এড়িয়ে চলা', 'লাইন ধরে চলা', ...SCHOOL_EXTRAS],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS],
  }),
  kit({
    code: 'QE036',
    name: 'ACEBOTT Intelligent Transportation Display Kit with Sandbox Map – Year 1',
    nameBn: 'স্মার্ট ট্রাফিক ডিসপ্লে কিট, স্যান্ডবক্স ম্যাপসহ – বছর ১',
    series: 'education',
    summaryBn: 'স্কুলের এক বছরের পুরো স্মার্ট ট্রাফিক পাঠ: ম্যাপ, ৪টি বোর্ড আর শার্কবট কার, সব প্রজেক্ট একসাথে।',
    ageMin: 9,
    learnBn: [
      'স্মার্ট স্ট্রিট লাইট ও ট্রাফিক লাইট',
      'স্মার্ট রাস্তা পারাপার ও পার্কিং',
      'ভয়েস কমান্ডে চলা গাড়ি',
      'বাধা এড়ানো ও লাইন ধরে চলা',
      'এনকোডার মোটর ও গাড়ির নেটওয়ার্কিং',
    ],
    specsBn: [
      'কন্ট্রোলার বোর্ড: ৪টি ESP32 ও ১টি শার্কবট কার, ৫টি প্রজেক্ট একসাথে চলে',
      CODING.school,
      YEAR_LESSONS,
      'স্যান্ডবক্স ম্যাপ সাথে আছে',
    ],
  }),
  kit({
    code: 'QE031',
    name: 'ACEBOTT Smart Factory Education Kit – Level 1',
    nameBn: 'স্মার্ট ফ্যাক্টরি এডুকেশন কিট – লেভেল ১',
    series: 'education',
    summaryBn: 'স্কুলের ক্লাসের জন্য কারখানার অটোমেশন: রোবট আর্ম, কনভেয়র বেল্ট আর স্মার্ট গুদাম।',
    ageMin: 10,
    learnBn: ['স্মার্ট রোবট আর্ম', 'স্মার্ট কনভেয়র বেল্ট', 'স্মার্ট গুদাম', ...SCHOOL_EXTRAS],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS, oneBoard('৩'), NO_MAP],
  }),
  kit({
    code: 'QE032',
    name: 'ACEBOTT TruckBott Smart Factory Education Kit – Level 2',
    nameBn: 'ট্রাকবট স্মার্ট ফ্যাক্টরি এডুকেশন কিট – লেভেল ২',
    series: 'education',
    summaryBn: 'ট্রাকবট রোবট গাড়ি, ফর্কলিফট বা ডাম্প ট্রাক হিসেবে বানানো যায়, কারখানায় মাল আনা-নেওয়ার পাঠ।',
    ageMin: 10,
    learnBn: [
      'ভয়েস কমান্ড চেনা',
      'গাড়ির নেটওয়ার্কিং',
      'এনকোডার মোটর',
      'বাধা এড়ানো ও লাইন ধরে চলা',
      'ফর্কলিফট আর ডাম্প ট্রাক (দুই রকম বডি)',
      ...SCHOOL_EXTRAS,
    ],
    specsBn: [BOARD.esp32, CODING.school, SCHOOL_LESSONS],
  }),
  kit({
    code: 'QE037',
    name: 'ACEBOTT Smart Factory Display Kit with Sandbox Map – Year 1',
    nameBn: 'স্মার্ট ফ্যাক্টরি ডিসপ্লে কিট, স্যান্ডবক্স ম্যাপসহ – বছর ১',
    series: 'education',
    summaryBn: 'স্কুলের এক বছরের পুরো স্মার্ট ফ্যাক্টরি পাঠ: ম্যাপ, ৩টি বোর্ড আর ট্রাকবট, সব প্রজেক্ট একসাথে।',
    ageMin: 10,
    learnBn: ['স্মার্ট রোবট আর্ম', 'স্মার্ট বাছাই (সর্টিং)', 'স্মার্ট গুদাম', 'মাল আনা-নেওয়া (হ্যান্ডলিং)', 'স্মার্ট লজিস্টিক ব্যবস্থা'],
    specsBn: [
      'কন্ট্রোলার বোর্ড: ৩টি ESP32 ও ১টি ট্রাকবট কার, ৪টি প্রজেক্ট একসাথে চলে',
      CODING.school,
      YEAR_LESSONS,
      'স্যান্ডবক্স ম্যাপ সাথে আছে',
    ],
  }),
];

export const activeProducts = () => products.filter((p) => p.active);

export const productsInSeries = (series: Series) => activeProducts().filter((p) => p.series === series);

// Kits without a price may use this test price so the order form can be tried
// end to end: always during local development (npm run dev), and on the live
// site while site.testPrices is true. Only kits with allowTestPrice get it, so
// the whole catalogue is not shown at one made-up price.
export const TEST_PRICE = 4500;

const testPricesOn = () => import.meta.env.DEV || site.testPrices;

export type OrderableProduct = Product & { price: number; testPrice: boolean };

// Prices from the Sheet's Prices tab (kit code -> Tk); see src/lib/site-data.ts.
// A price there wins over `price` in this file.
export type PriceList = Record<string, number>;

// Kits a customer can pre-order right now: active and with a price.
export const orderableProducts = (prices: PriceList): OrderableProduct[] =>
  activeProducts().flatMap((p): OrderableProduct[] => {
    const price = prices[p.code] ?? p.price;
    if (price !== null) return [{ ...p, price, testPrice: false }];
    if (p.allowTestPrice && testPricesOn()) return [{ ...p, price: TEST_PRICE, testPrice: true }];
    return [];
  });

export const findOrderable = (prices: PriceList, slug: string) =>
  orderableProducts(prices).find((p) => p.slug === slug);

export const advanceAmount = (price: number, percent: number) =>
  Math.ceil((price * percent) / 100);
