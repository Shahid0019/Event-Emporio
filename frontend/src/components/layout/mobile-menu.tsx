"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Heart, LogOut, Package, User } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Logo } from "@/components/ui/primitives";
import { mainNav } from "@/lib/site";
import { sessionStore, setMenuOpen, signOut, uiStore } from "@/lib/store";
import { Initials } from "./account-menu";
import type { MegaMenuData } from "./header";

export function MobileMenu({ menu, instagram }: { menu: MegaMenuData; instagram: string }) {
  const open = uiStore.useStore((s) => s.menuOpen);
  const user = sessionStore.useStore();
  const close = () => setMenuOpen(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setMenuOpen} title={<Logo />} side="left" description="Site navigation" bodyClassName="px-0 py-0">
      <nav aria-label="Mobile" className="flex min-h-full flex-col">
        <div className="px-6 pt-5">
          <Link
            href="/kit"
            onClick={close}
            className="flex min-h-12 items-center justify-between rounded-full bg-brand px-5 text-[0.78rem] font-medium uppercase tracking-[0.12em] text-brand-ink"
          >
            Build my kit
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <ul className="px-6 pt-2">
          {mainNav.map((item) => (
            <li key={item.href} className="border-b border-line">
              <Link
                href={item.href}
                onClick={close}
                className="flex items-center justify-between py-4 font-serif text-[1.65rem] leading-none"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="px-6 pt-8">
          <p className="eyebrow mb-4 text-accent-ink">Categories</p>
          <ul className="grid grid-cols-1 gap-y-3 min-[400px]:grid-cols-2 min-[400px]:gap-x-4">
            {menu.categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} onClick={close} className="text-[0.95rem] text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-3 mb-3 mt-auto space-y-1 rounded-card bg-surface px-5 py-5">
          {user ? (
            <Link href="/account" onClick={close} className="mb-2 flex items-center gap-3 border-b border-line pb-4">
              <Initials user={user} className="size-10 text-[0.82rem]" />
              <span className="min-w-0">
                <span className="block truncate text-[0.95rem] font-medium">Hello, {user.name.trim().split(/\s+/)[0] || user.email}</span>
                <span className="block truncate text-[0.78rem] text-muted">My account · orders · addresses</span>
              </span>
            </Link>
          ) : (
            <MenuRow href="/login" icon={<User />} label="Sign in / Register" onClick={close} />
          )}
          <MenuRow href="/wishlist" icon={<Heart />} label="Wishlist" onClick={close} />
          <MenuRow
            href={user ? "/account/orders" : "/track-order"}
            icon={<Package />}
            label={user ? "My orders" : "Track an order"}
            onClick={close}
          />
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2.5 text-[0.95rem]">
            <ArrowUpRight className="size-[1.1rem] stroke-[1.5]" />
            Instagram
          </a>
          {user && (
            <button
              type="button"
              onClick={() => {
                signOut();
                close();
                toast("You've been signed out");
                if (pathname?.startsWith("/account")) router.push("/");
              }}
              className="flex w-full items-center gap-3 py-2.5 text-left text-[0.95rem] text-muted"
            >
              <LogOut className="size-[1.1rem] stroke-[1.5]" />
              Sign out
            </button>
          )}
        </div>
      </nav>
    </Sheet>
  );
}

function MenuRow({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 py-2.5 text-[0.95rem] [&_svg]:size-[1.1rem] [&_svg]:stroke-[1.5]"
    >
      {icon}
      {label}
    </Link>
  );
}
