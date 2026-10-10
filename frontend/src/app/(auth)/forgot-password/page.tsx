import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ForgotPasswordForm />;
}
