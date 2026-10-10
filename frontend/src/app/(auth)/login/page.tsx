import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <LoginForm />;
}
