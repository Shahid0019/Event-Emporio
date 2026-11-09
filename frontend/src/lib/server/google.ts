import { createHash, randomBytes } from "node:crypto";
import type { GoogleProfile } from "./accounts";

/**
 * "Continue with Google" (OAuth 2.0 authorization code + PKCE). Needs GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET from Google Cloud Console → APIs & Services → Credentials (a "Web
 * application" client) with this redirect URI added for each site address:
 *   https://<your-site>/api/account/google/callback   (and http://localhost:3000/… for development)
 */
const config = () => {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
  return id && secret ? { id, secret } : null;
};

export const googleConfigured = () => Boolean(config());

/** Remembers the state and PKCE verifier between leaving for Google and coming back. */
export const GOOGLE_COOKIE = "ee_google";
/** Tells the next page load to pick up the new sign-in and say hello (read by StoreDataProvider). */
export const HELLO_COOKIE = "ee_hello";

const redirectUri = (origin: string) => `${origin}/api/account/google/callback`;

/** Only same-site paths (no open redirects through ?next=). */
export const safePath = (value: string | null | undefined, fallback: string) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;

/** Where to send the browser, plus the state and PKCE verifier to remember until Google sends it back. */
export function googleAuthStart(origin: string) {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config()!.id,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

/**
 * Swaps the code for Google's ID token and reads the profile from it. The token comes straight
 * from Google over TLS, so its claims are checked (issuer, audience, expiry) without a signature check.
 */
export async function googleProfile(origin: string, code: string, verifier: string): Promise<GoogleProfile | null> {
  const c = config();
  if (!c) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.id,
      client_secret: c.secret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    console.error("google token failed", res.status, await res.text());
    return null;
  }
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issuerOk || claims.aud !== c.id || !claims.exp || claims.exp * 1000 < Date.now() || !claims.sub || !claims.email) return null;
  return { sub: claims.sub, email: claims.email, emailVerified: claims.email_verified === true, name: claims.name };
}
