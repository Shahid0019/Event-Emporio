"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import {
  BadgePercent,
  Boxes,
  ClipboardList,
  ExternalLink,
  FolderTree,
  GalleryHorizontal,
  Inbox,
  LayoutDashboard,
  Layers,
  Mail,
  Menu,
  MessageSquareQuote,
  Package,
  PanelsTopLeft,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { resetAdminData } from "@/lib/store/admin-store";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/collections", label: "Collections", icon: Layers },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/banners", label: "Homepage & banners", icon: PanelsTopLeft },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/admin/gallery", label: "Gallery", icon: GalleryHorizontal },
    ],
  },
  {
    label: "Inbox",
    items: [
      { href: "/admin/custom-orders", label: "Custom orders", icon: Sparkles },
      { href: "/admin/enquiries", label: "Contact enquiries", icon: Inbox },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Admin users", icon: ShieldCheck },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-[#f7f4ef] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas lg:flex">
        <SidebarContents />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            className="-ml-2 grid size-10 place-items-center lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <p className="hidden items-center gap-2 text-[0.78rem] text-muted sm:flex">
            <span className="rounded-full border border-accent/60 bg-accent-soft/50 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-ink">
              Demo mode
            </span>
            Changes are saved in this browser only.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAdminData();
                toast("Demo data reset");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[0.78rem] text-muted hover:bg-surface hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> Reset demo
            </button>
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.78rem] hover:border-ink"
            >
              View store <ExternalLink className="size-3.5" />
            </Link>
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
      <Suspense fallback={<Nav pathname={null} />}>
        <NavWithPath />
      </Suspense>
      <div className="border-t border-line px-6 py-4 text-[0.78rem] text-muted">
        Signed in as <span className="text-ink">Store Owner (demo)</span>
      </div>
    </>
  );
}

function NavWithPath() {
  return <Nav pathname={usePathname()} />;
}

function Nav({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="mb-1.5 px-3 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">{g.label}</p>
          <ul>
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
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
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="px-3 text-[0.72rem] leading-relaxed text-muted">
        <ClipboardList className="mb-1 inline size-3.5" /> Every action here becomes an authenticated, role-checked and audit-logged API
        call once the backend is connected.
      </p>
    </nav>
  );
}
