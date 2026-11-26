// @ts-check
import { defineConfig, envField } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  env: {
    // Secrets live in Cloudflare (npx wrangler secret put NAME) and, for local
    // development, in .dev.vars. See .dev.vars.example.
    schema: {
      // Google Apps Script web app that writes orders into the Sheet.
      ORDER_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ORDER_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Cloudflare Turnstile spam check. Leave both unset to switch it off.
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});