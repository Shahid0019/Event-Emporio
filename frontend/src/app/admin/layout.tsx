import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { template: "%s · Admin · Events Emporio", default: "Admin · Events Emporio" },
  robots: { index: false, follow: false },
};

/**
 * DEMO: no authentication yet. In production this segment is protected
 * server-side (session + role check in the layout and every admin API),
 * never by hiding links in the UI.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
