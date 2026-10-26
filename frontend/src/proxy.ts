import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH, verifyAdminToken } from "@/lib/admin-auth";

/** Every /admin request needs a valid admin session cookie; otherwise go to the admin sign-in. */
export async function proxy(request: NextRequest) {
  if (await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const login = new URL(ADMIN_LOGIN_PATH, request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
