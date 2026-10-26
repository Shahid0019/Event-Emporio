"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  BadgePercent,
  Boxes,
  ExternalLink,
  FolderTree,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  PackageOpen,
  PackagePlus,
  PartyPopper,
  Puzzle,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminSignOut } from "@/app/(auth)/admin-login/actions";
import { Sheet } from "@/components/ui/sheet";
import type { AdminData } from "@/lib/admin-data";
import { adminStore } from "@/lib/store/admin-store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** How many things here need attention (shown as a badge). */
  count?: (d: AdminData) => number;
}

const toPack = (d: AdminData) => d.orders.filter((o) => o.status === "confirmed" || o.status === "processing");
const ofKind = (d: AdminData, kind: string) => toPack(d).filter((o) => o.kinds?.includes(kind as never)).length;

const groups: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Orders",
    items: [
      { href: "/admin/orders", label: "All orders", icon: ShoppingCart, count: (d) => toPack(d).length },
      { href: "/admin/orders?kind=regular", label: "Product orders", icon: Package, count: (d) => ofKind(d, "regular") },
      { href: "/admin/orders?kind=built-kit", label: "Built kit orders", icon: Puzzle, count: (d) => ofKind(d, "built-kit") },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/functions", label: "Functions", icon: PartyPopper },
      { href: "/admin/kit-products", label: "Kit products", icon: PackagePlus },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/inventory", label: "Stock levels", icon: Boxes },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/kits", label: "Kits for customers", icon: PackageOpen },
    ],
  },
  {
    label: "Inbox",
    items: [
      {
        href: "/admin/custom-orders",
        label: "Custom order requests",
        icon: Sparkles,
        count: (d) => d.customRequests.filter((r) => r.status === "new").length,
      },
      { href: "/admin/enquiries", label: "Messages", icon: Inbox, count: (d) => d.enquiries.filter((e) => e.status === "new").length },
      {
        href: "/admin/product-reviews",
        label: "Product reviews",
        icon: Star,
        count: (d) => d.productReviews.filter((r) => r.status === "pending").length,
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Discount codes", icon: BadgePercent },
      { href: "/admin/testimonials", label: "Home testimonials", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Access & activity", icon: History },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const adminEmail = adminStore.useStore((d) => d.adminEmail);
  return (
    <div className="min-h-dvh bg-[#f7f4ef] lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas lg:flex">
        <SidebarContents />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-surface lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/admin" className="font-serif text-lg lg:hidden">
            Events <em className="text-brand">Emporio</em>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[0.78rem] text-muted md:inline">{adminEmail}</span>
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.78rem] hover:border-ink"
            >
              View shop <ExternalLink className="size-3.5" />
            </Link>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[0.78rem] text-muted hover:bg-surface hover:text-ink"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen} title="Admin" side="left" bodyClassName="p-0">
        <div onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          <SidebarContents compact />
        </div>
      </Sheet>
    </div>
  );
}

function SidebarContents({ compact }: { compact?: boolean }) {
  return (
    <>
      {!compact && (
        <div className="flex h-16 items-center border-b border-line px-6">
          <Link href="/admin" className="font-serif text-xl">
            Events <em className="text-brand">Emporio</em>
            <span className="ml-2 align-middle font-sans text-[0.6rem] uppercase tracking-[0.18em] text-muted">Admin</span>
          </Link>
        </div>
      )}
      <Suspense fallback={<Nav pathname={null} kind={null} />}>
        <NavWithPath />
      </Suspense>
    </>
  );
}

function NavWithPath() {
  return <Nav pathname={usePathname()} kind={useSearchParams().get("kind")} />;
}

function Nav({ pathname, kind }: { pathname: string | null; kind: string | null }) {
  const data = adminStore.useStore();
  return (
    <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="mb-1.5 px-3 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">{g.label}</p>
          <ul>
            {g.items.map(({ href, label, icon: Icon, count }) => {
              const [path, query] = href.split("?");
              const itemKind = query ? new URLSearchParams(query).get("kind") : null;
              const active =
                path === "/admin"
                  ? pathname === "/admin"
                  : path === "/admin/orders"
                    ? pathname === "/admin/orders" && kind === itemKind
                    : Boolean(pathname?.startsWith(path));
              const n = count?.(data) ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-control px-3 py-2 text-[0.88rem] transition-colors",
                      active ? "bg-brand text-brand-ink" : "text-ink hover:bg-surface",
                    )}
                  >
                    <Icon className="size-4 shrink-0 stroke-[1.6]" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {n > 0 && (
                      <span
                        className={cn(
                          "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.68rem] font-medium tabular-nums",
                          active ? "bg-brand-ink text-brand" : "bg-brand text-brand-ink",
                        )}
                        aria-label={`${n} need attention`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
