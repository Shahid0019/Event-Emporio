import { cookies } from "next/headers";
import { createSignedToken, readSignedToken } from "../signed-token";

/**
 * Customer sessions: a signed, HTTP-only cookie holding the account id.
 * Server only — the browser keeps just the name/email for display.
 */
export const SESSION_COOKIE = "ee_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET (32+ characters) is not configured.");
  return secret;
}

export async function currentAccountId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await readSignedToken(sessionSecret(), token);
  } catch {
    return null;
  }
}

/** The session cookie as [name, value, options], for responses that set it themselves (e.g. a redirect). */
export async function sessionCookie(accountId: string) {
  return [
    SESSION_COOKIE,
    await createSignedToken(sessionSecret(), accountId, SESSION_SECONDS),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS },
  ] as const;
}

export async function startSession(accountId: string) {
  (await cookies()).set(...(await sessionCookie(accountId)));
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
