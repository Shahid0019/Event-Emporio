"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, House, ShoppingBag, Store } from "lucide-react";
import { cartCount, cartStore, openCart, wishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Phone and tablet tab bar: the main destinations within thumb reach.
 * Plan My Function sits raised in the middle as the shop's signature action;
 * the bag opens the drawer like the header button does. Hidden from lg up,
 * where the header carries everything (--bottom-nav-h is 0 there).
 */
export function BottomNav() {
  const pathname = usePathname() ?? "";
  const bag = cartStore.useStore(cartCount);
  const saved = wishlistStore.useStore((items) => items.length);
  const shopActive = pathname === "/shop" || pathname.startsWith("/category") || pathname.startsWith("/products");

  return (
    <nav
      aria-label="Quick links"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-raised/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgb(34_41_35/0.35)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 items-stretch">
        <li>
          <Tab href="/" label="Home" active={pathname === "/"}>
            <House />
          </Tab>
        </li>
        <li>
          <Tab href="/shop" label="Shop" active={shopActive}>
            <Store />
          </Tab>
        </li>
        <li className="relative">
          <Link
            href="/kit"
            aria-current={pathname.startsWith("/kit") ? "page" : undefined}
            className="group flex h-full flex-col items-center justify-end pb-1.5 text-2xs font-medium text-brand"
          >
            <span
              aria-hidden
              className="absolute -top-5 left-1/2 grid -translate-x-1/2 size-14 place-items-center rounded-full border-4 border-canvas bg-brand text-brand-ink shadow-[0_10px_24px_-10px_rgb(66_94_42/0.7)] transition-transform group-active:scale-95"
            >
              {/* Line-art cart used as a mask, so it takes the button's ink colour. */}
              <span className="size-[1.85rem] bg-current" style={kitIcon} />
            </span>
            Plan
          </Link>
        </li>
        <li>
          <Tab href="/wishlist" label="Wishlist" active={pathname.startsWith("/wishlist")} count={saved}>
            <Heart />
          </Tab>
        </li>
        <li>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Bag${bag ? `, ${bag} items` : ", empty"}`}
            className={tabClass(pathname.startsWith("/cart"))}
          >
            <Icon count={bag}>
              <ShoppingBag />
            </Icon>
            Bag
          </button>
        </li>
      </ul>
    </nav>
  );
}

const kitIconMask = "url(/images/icons/kit-cart.png) center / contain no-repeat";
const kitIcon = { mask: kitIconMask, WebkitMask: kitIconMask } as const;

const tabClass = (active: boolean) =>
  cn(
    "flex h-full w-full flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors active:bg-surface/70",
    active ? "text-brand" : "text-muted hover:text-ink",
  );

function Tab({ href, label, active, count, children }: { href: string; label: string; active: boolean; count?: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={count ? `${label}, ${count} items` : undefined}
      className={tabClass(active)}
    >
      <Icon count={count}>{children}</Icon>
      {label}
    </Link>
  );
}

function Icon({ count, children }: { count?: number; children: React.ReactNode }) {
  return (
    <span aria-hidden className="relative [&_svg]:size-[1.35rem] [&_svg]:stroke-[1.5]">
      {children}
      {count ? (
        <span className="absolute -right-2.5 -top-1.5 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-brand px-1 text-2xs font-medium leading-none text-brand-ink">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </span>
  );
}
