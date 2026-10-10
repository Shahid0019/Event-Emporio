import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";

export const metadata: Metadata = {
  title: { template: "%s | My Account | Events Emporio", default: "My Account" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-luxe pb-28 pt-10 sm:pt-14">
      <AccountShell>{children}</AccountShell>
    </div>
  );
}
