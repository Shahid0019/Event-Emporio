/**
 * Small signed tokens for session cookies: base64url(payload).signature,
 * HMAC-SHA256 with a server secret and an expiry. Web Crypto only, so it
 * works in the proxy, route handlers and server actions.
 */

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

/** Compares two strings without bailing out at the first different character. */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function createSignedToken(secret: string, subject: string, ttlSeconds: number, now = Date.now()): Promise<string> {
  const payload = JSON.stringify({ sub: subject, exp: Math.floor(now / 1000) + ttlSeconds });
  return `${toBase64Url(encoder.encode(payload))}.${await hmac(secret, payload)}`;
}

/** The token's subject, or null for a missing, forged or expired token. */
export async function readSignedToken(secret: string | null, token: string | undefined, now = Date.now()): Promise<string | null> {
  if (!secret || !token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: string;
  try {
    payload = fromBase64Url(encoded);
  } catch {
    return null;
  }
  if (!constantTimeEqual(signature, await hmac(secret, payload))) return null;
  try {
    const { sub, exp } = JSON.parse(payload) as { sub?: unknown; exp?: unknown };
    if (typeof sub !== "string" || typeof exp !== "number" || exp <= now / 1000) return null;
    return sub;
  } catch {
    return null;
  }
}
