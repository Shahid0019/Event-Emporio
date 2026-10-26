import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH, verifyAdminToken } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/server/admin-data";
import { AdminDataProvider } from "@/lib/store/admin-store";

export const metadata: Metadata = {
  title: { template: "%s · Admin · Events Emporio", default: "Admin · Events Emporio" },
  robots: { index: false, follow: false },
};

/**
 * Admin area. `src/proxy.ts` already turns signed-out visitors away; the
 * session is checked again here and on every save.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminData>{children}</AdminData>
    </Suspense>
  );
}

async function AdminData({ children }: { children: React.ReactNode }) {
  // Always per request: live data, and the sign-in check uses the current time.
  await connection();
  const email = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!email) redirect(ADMIN_LOGIN_PATH);
  const data = await loadAdminData(email);
  return (
    <AdminDataProvider initial={data}>
      <AdminShell>{children}</AdminShell>
    </AdminDataProvider>
  );
}

function AdminLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-label="Loading the admin">
      <span className="size-8 animate-spin rounded-full border-2 border-brand border-r-transparent" />
    </div>
  );
}
