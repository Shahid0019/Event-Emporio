import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ResetPasswordForm />;
}
