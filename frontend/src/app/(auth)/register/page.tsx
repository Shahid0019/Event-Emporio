import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";
import { googleConfigured } from "@/lib/server/google";
import { phoneSignInAvailable } from "@/lib/server/phone-code";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <RegisterForm google={googleConfigured() || process.env.NODE_ENV !== "production"} phone={phoneSignInAvailable()} />;
}
