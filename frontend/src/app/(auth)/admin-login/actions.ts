"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_SECONDS,
  adminSecret,
  constantTimeEqual,
  createAdminToken,
  safeAdminNext,
} from "@/lib/admin-auth";

export interface AdminLoginState {
  error?: string;
  email?: string;
}

export async function adminSignIn(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeAdminNext(String(formData.get("next") ?? ""));

  // ADMIN_DEMO_* are the older names, still accepted.
  const expectedEmail = (process.env.ADMIN_EMAIL ?? process.env.ADMIN_DEMO_EMAIL)?.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_DEMO_PASSWORD;
  if (!expectedEmail || !expectedPassword || !adminSecret()) {
    return { email, error: "Admin sign-in isn't set up yet. Add the ADMIN_* values to .env.local and restart the server." };
  }

  // Check both fields every time so a wrong email and a wrong password take the same path.
  const emailOk = constantTimeEqual(email, expectedEmail);
  const passwordOk = constantTimeEqual(password, expectedPassword);
  if (!emailOk || !passwordOk) {
    await new Promise((r) => setTimeout(r, 400)); // slows down guessing a little
    return { email, error: "That email and password don't match." };
  }

  (await cookies()).set(ADMIN_COOKIE, await createAdminToken(expectedEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect(next);
}

export async function adminSignOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect(ADMIN_LOGIN_PATH);
}
