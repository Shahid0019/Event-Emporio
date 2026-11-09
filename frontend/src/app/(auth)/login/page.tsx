import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import { googleConfigured } from "@/lib/server/google";
import { phoneSignInAvailable } from "@/lib/server/phone-code";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: true },
};

export default function Page() {
  // Google shows in development even before it is set up, so the button can be seen; it explains when clicked.
  return <LoginForm google={googleConfigured() || process.env.NODE_ENV !== "production"} phone={phoneSignInAvailable()} />;
}
