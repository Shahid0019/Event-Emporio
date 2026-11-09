import { NextResponse, type NextRequest } from "next/server";
import { linkGoogle, signInWithGoogle } from "@/lib/server/accounts";
import { currentAccountId, sessionCookie, sessionSecret } from "@/lib/server/customer-session";
import { GOOGLE_COOKIE, googleProfile, HELLO_COOKIE, safePath } from "@/lib/server/google";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { constantTimeEqual, readSignedToken } from "@/lib/signed-token";

type Saved = { state: string; verifier: string; next: string; link: boolean };

/** Google sends the shopper back here after they choose an account. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  let saved: Saved | null = null;
  try {
    const raw = await readSignedToken(`${sessionSecret()}:google`, request.cookies.get(GOOGLE_COOKIE)?.value);
    saved = raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    saved = null;
  }
  const next = safePath(saved?.next, "/account");

  const finish = (path: string, hello: boolean) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.delete({ name: GOOGLE_COOKIE, path: "/api/account/google" });
    if (hello) response.cookies.set(HELLO_COOKIE, "1", { sameSite: "lax", path: "/", maxAge: 60 });
    return response;
  };
  const fail = (reason: "cancelled" | "failed" | "taken" | "email") =>
    saved?.link
      ? finish(`/account/profile?google=${reason}`, false)
      : finish(`/login?google=${reason}&next=${encodeURIComponent(next)}`, false);

  if (!saved || !constantTimeEqual(searchParams.get("state") ?? "", saved.state)) return fail("failed");
  if (searchParams.get("error")) return fail("cancelled");
  const code = searchParams.get("code");
  if (!code || !rateLimit(`google:${clientKey(request)}`, 20, 15 * 60_000).ok) return fail("failed");

  const profile = await googleProfile(origin, code, saved.verifier).catch((err: unknown) => {
    console.error("google sign-in failed", err);
    return null;
  });
  if (!profile) return fail("failed");

  if (saved.link) {
    const id = await currentAccountId();
    if (!id) return finish(`/login?next=${encodeURIComponent("/account/profile")}`, false);
    const linked = await linkGoogle(id, profile.sub);
    return linked.ok ? finish("/account/profile?google=linked", true) : fail("taken");
  }

  const result = await signInWithGoogle(profile);
  if (!result.ok) return fail("email");
  const response = finish(next, true);
  response.cookies.set(...(await sessionCookie(result.account.id)));
  return response;
}
