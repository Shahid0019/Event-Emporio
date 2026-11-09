import { NextResponse, type NextRequest } from "next/server";
import { sessionSecret } from "@/lib/server/customer-session";
import { GOOGLE_COOKIE, googleAuthStart, googleConfigured, safePath } from "@/lib/server/google";
import { createSignedToken } from "@/lib/signed-token";

/** Starts "Continue with Google". `?link=1` connects Google to the signed-in account instead. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const link = searchParams.get("link") === "1";
  const next = safePath(searchParams.get("next"), link ? "/account/profile" : "/account");
  if (!googleConfigured()) {
    const back = new URL(link ? "/account/profile" : "/login", origin);
    back.searchParams.set("google", "setup");
    if (!link) back.searchParams.set("next", next);
    return NextResponse.redirect(back);
  }
  const start = googleAuthStart(origin);
  const remembered = await createSignedToken(
    `${sessionSecret()}:google`,
    JSON.stringify({ state: start.state, verifier: start.verifier, next, link }),
    10 * 60,
  );
  const response = NextResponse.redirect(start.url);
  response.cookies.set(GOOGLE_COOKIE, remembered, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/account/google",
    maxAge: 10 * 60,
  });
  return response;
}
