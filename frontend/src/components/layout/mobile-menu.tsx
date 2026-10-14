"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, Package, User } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Logo } from "@/components/ui/primitives";
import { mainNav } from "@/lib/site";
import { sessionStore, setMenuOpen, uiStore } from "@/lib/store";
import type { MegaMenuData } from "./header";

export function MobileMenu({ menu, instagram }: { menu: MegaMenuData; instagram: string }) {
  const open = uiStore.useStore((s) => s.menuOpen);
  const user = sessionStore.useStore();
  const close = () => setMenuOpen(false);

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
          <MenuRow
            href={user ? "/account" : "/login"}
            icon={<User />}
            label={user ? `Hello, ${user.name.split(" ")[0]}` : "Sign in / Register"}
            onClick={close}
          />
          <MenuRow href="/wishlist" icon={<Heart />} label="Wishlist" onClick={close} />
          <MenuRow href="/track-order" icon={<Package />} label="Track an order" onClick={close} />
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2.5 text-[0.95rem]">
            <ArrowUpRight className="size-[1.1rem] stroke-[1.5]" />
            Instagram
          </a>
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
