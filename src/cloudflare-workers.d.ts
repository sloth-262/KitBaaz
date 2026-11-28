// The parts of the Cloudflare Workers runtime this site uses (src/lib/site-data.ts).
// Written by hand: the full file from `wrangler types` clashes with the browser
// types used by the pages' scripts.
declare module 'cloudflare:workers' {
  interface KV {
    get<T>(key: string, type: 'json'): Promise<T | null>;
    put(key: string, value: string): Promise<void>;
  }
  export const env: { SITE_CACHE: KV }; // binding in wrangler.jsonc
  export function waitUntil(promise: Promise<unknown>): void;
}
