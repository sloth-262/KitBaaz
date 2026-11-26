# KitBaaz

Bangla pre-order website for ACEBOTT STEM and robotics kits in Bangladesh.

Built with [Astro](https://astro.build) and deployed to Cloudflare Workers.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the local site at http://localhost:4321 |
| `npm run build` | Build the site into `dist/` |
| `npm run deploy` | Build and publish to Cloudflare (needs `npx wrangler login` first) |

## Where things are

| What | File |
|---|---|
| Contact details, advance %, delivery days | `src/data/site.ts` |
| Kits, prices, box contents | `src/data/products.ts` |
| Landing page | `src/pages/index.astro` |
| Shared layout, fonts | `src/layouts/Base.astro` |
| Colours and base styles | `src/styles/global.css` |

## Rules

- Placeholder images only. No ACEBOTT images, videos or slides until Shakil confirms written permission.
- The site records payment methods; it never takes or holds money.
