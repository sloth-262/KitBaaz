// A short code tied to one order ID, put in the thank-you page link.
// /api/payment only accepts a TrxID for an order when the code matches, so
// nobody can attach TrxIDs to other people's orders by guessing order IDs.
// Server-only: it uses the webhook secret.

const encoder = new TextEncoder();

export async function claimKey(secret: string, orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`claim:${orderId}`)));
  return [...sig.slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function claimKeyMatches(secret: string, orderId: string, key: string): Promise<boolean> {
  const expected = await claimKey(secret, orderId);
  if (key.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
