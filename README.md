# KitBaaz

Bangla pre-order website for ACEBOTT STEM and robotics kits in Bangladesh.

Built with [Astro](https://astro.build) and deployed to Cloudflare Workers.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the local site at http://localhost:4321 |
| `npm run build` | Build the site into `dist/` |
| `npm run check` | Type-check the project |
| `npm run test:apps-script` | Test the order sheet script |
| `npm run deploy` | Build and publish to Cloudflare (needs `npx wrangler login` first) |

## Where things are

| What | File |
|---|---|
| Contact details, advance %, delivery days | `src/data/site.ts` |
| Kits, prices, box contents | `src/data/products.ts` |
| Landing page | `src/pages/index.astro` |
| Kit pages | `src/pages/kits/[slug].astro` |
| Pre-order form | `src/pages/order.astro` |
| Thank-you page | `src/pages/thanks.astro` |
| Order handler (server) | `src/pages/api/order.ts` |
| Payment TrxID handler (server) | `src/pages/api/payment.ts` |
| Talking to the Google Sheet | `src/lib/sheet.ts` |
| Order rules (phone check, totals) | `src/lib/order.ts` |
| Order sheet script + setup guide | `apps-script/` |
| Shared layout, fonts | `src/layouts/Base.astro` |
| Colours and base styles | `src/styles/global.css` |

## Settings and secrets

Copy `.dev.vars.example` to `.dev.vars` for local development. On Cloudflare, set each value with `npx wrangler secret put NAME`.

Without `ORDER_WEBHOOK_URL`, local test orders get a `KB-DEV-XXXX` ID and are not saved anywhere.

## Rules

- Placeholder images only. No ACEBOTT images, videos or slides until Shakil confirms written permission.
- The site records payment methods; it never takes or holds money.
