/**
 * Admin session: one shop-team login configured in the server environment
 * (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_SESSION_SECRET). The session is a
 * signed, HTTP-only cookie checked in `src/proxy.ts` before any /admin page
 * renders, and again by every admin save.
 *
 * Web Crypto only, so it runs in the proxy and in server actions alike.
 * Never import this into a Client Component.
 */

import { constantTimeEqual, createSignedToken, readSignedToken } from "./signed-token";

export const ADMIN_COOKIE = "ee_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_LOGIN_PATH = "/admin-login";

/** The signing secret, or null when it's missing or too short (sign-in then stays disabled). */
export function adminSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export { constantTimeEqual };

export async function createAdminToken(email: string, now = Date.now()): Promise<string> {
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return createSignedToken(secret, email, ADMIN_SESSION_SECONDS, now);
}

/** Returns the signed-in admin's email, or null for a missing, forged or expired token. */
export const verifyAdminToken = (token: string | undefined, now = Date.now()) => readSignedToken(adminSecret(), token, now);

/** Only same-site /admin paths are allowed after sign-in (no open redirects). */
export function safeAdminNext(next: string | null | undefined): string {
  return next && /^\/admin(\/|\?|$)/.test(next) && !next.startsWith("//") ? next : "/admin";
}
