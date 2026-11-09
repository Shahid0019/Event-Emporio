"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { NavigationMenu } from "radix-ui";
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/ui/primitives";
import { mainNav } from "@/lib/site";
import { AccountMenu } from "./account-menu";
import { cartCount, cartStore, openCart, setMenuOpen, setSearchOpen, wishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface MegaMenuData {
  categories: { slug: string; name: string }[];
}

export function Header({ menu }: { menu: MegaMenuData }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-scrolled={scrolled || undefined} className="group/header fixed inset-x-0 top-0 z-40">
      {/* Floating tiles: logo, frosted navigation, frosted actions, then the kit call to action.
          Phones get a single frosted bar. Tiles + padding add up to --header-h. */}
      <div className="container-luxe flex h-[var(--header-h)] items-stretch gap-2 py-2">
        <div className={cn(tile, glass, "hidden shrink-0 items-center px-4 lg:flex xl:px-6 lg:[&>a>span]:text-[1.45rem] xl:[&>a>span]:text-[1.7rem]")}>
          <Logo />
        </div>

        <div
          className={cn(tile, glass, "grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center px-1.5 lg:flex lg:justify-center lg:px-2 xl:px-3")}
        >
          {/* Phones: menu, logo, search + account. Shop, kit, wishlist and bag live in the bottom bar. */}
          <div className="flex items-center lg:hidden">
            <IconButton label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu />
            </IconButton>
          </div>
          <Logo className="lg:hidden [&>span]:text-[1.35rem] sm:[&>span]:text-[1.5rem]" />
          <div className="flex items-center justify-end lg:hidden">
            <IconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search />
            </IconButton>
            <AccountMenu className="grid" />
          </div>

          <Suspense fallback={<DesktopNav menu={menu} pathname={null} />}>
            <DesktopNavWithPath menu={menu} />
          </Suspense>
        </div>

        <div className={cn(tile, glass, "hidden shrink-0 items-center gap-0.5 px-1.5 lg:flex")}>
          <IconButton label="Search" onClick={() => setSearchOpen(true)}>
            <Search />
          </IconButton>
          <AccountMenu />
          <WishlistLink />
          <CartButton />
        </div>

        <Link
          href="/kit"
          className={cn(
            tile,
            "hidden shrink-0 items-center bg-brand px-4 text-[0.9rem] xl:px-6 font-medium whitespace-nowrap text-brand-ink transition-colors hover:bg-brand-deep lg:flex",
          )}
        >
          Plan My Function
        </Link>
      </div>
    </header>
  );
}

/** One floating piece of the header; lifts a little once the page scrolls under it. */
const tile = "rounded-control transition-shadow duration-500 group-data-[scrolled]/header:shadow-[0_12px_30px_-18px_rgb(34_41_35/0.35)]";
const glass = "border border-white/70 bg-raised/70 backdrop-blur-md";

function DesktopNavWithPath({ menu }: { menu: MegaMenuData }) {
  return <DesktopNav menu={menu} pathname={usePathname()} />;
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/shop") return pathname === "/shop" || pathname.startsWith("/category") || pathname.startsWith("/products");
  return pathname.startsWith(href);
}

const navLink =
  "inline-flex h-10 items-center gap-1 rounded-chip px-2.5 text-[0.86rem] font-medium xl:px-3.5 xl:text-[0.92rem] whitespace-nowrap text-ink transition-colors hover:bg-surface/80 hover:text-brand data-[active]:text-brand xl:px-4";

function DesktopNav({ menu, pathname }: { menu: MegaMenuData; pathname: string | null }) {
  return (
    <NavigationMenu.Root className="hidden lg:block" delayDuration={80}>
      <NavigationMenu.List className="flex items-center">
        {mainNav.map((item) =>
          "mega" in item ? (
            <NavigationMenu.Item key={item.href}>
              <NavigationMenu.Trigger className={cn(navLink, "group")} data-active={isActive(pathname, item.href) || undefined}>
                {item.label}
                <ChevronDown aria-hidden className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="data-[motion]:animate-overlay-in">
                <MegaMenu menu={menu} />
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          ) : (
            <NavigationMenu.Item key={item.href}>
              <NavigationMenu.Link asChild active={isActive(pathname, item.href)}>
                <Link href={item.href} className={navLink} data-active={isActive(pathname, item.href) || undefined}>
                  {item.label}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          ),
        )}
      </NavigationMenu.List>
      {/* Positioned against the sticky <header>, so it always opens directly beneath it. */}
      <div className="absolute inset-x-0 top-full flex justify-center">
        <NavigationMenu.Viewport className="mx-auto w-[calc(100%-2*var(--gutter))] max-w-[calc(92rem-2*var(--gutter))] origin-top overflow-hidden rounded-card border border-line bg-canvas shadow-[0_30px_60px_-30px_rgb(34_41_35/0.25)] data-[state=open]:animate-overlay-in" />
      </div>
    </NavigationMenu.Root>
  );
}

function MegaMenu({ menu }: { menu: MegaMenuData }) {
  return (
    <div className="container-luxe grid grid-cols-12 gap-10 py-12">
      <div className="col-span-8">
        <p className="eyebrow mb-6 text-accent-ink">Shop by category</p>
        <ul className="grid grid-cols-2 gap-x-10 gap-y-1">
          {menu.categories.map((c) => (
            <li key={c.slug}>
              <NavigationMenu.Link asChild>
                <Link
                  href={`/category/${c.slug}`}
                  className="group inline-flex items-center gap-3 py-1.5 font-serif text-[1.65rem] leading-tight text-ink transition-colors hover:text-brand"
                >
                  {c.name}
                  <ArrowRight className="size-4 -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="col-span-4 border-l border-line pl-10">
        <p className="eyebrow mb-6 text-accent-ink">More</p>
        <ul className="space-y-3">
          <li>
            <NavigationMenu.Link asChild>
              <Link href="/shop" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                Shop all products
              </Link>
            </NavigationMenu.Link>
          </li>
          <li>
            <NavigationMenu.Link asChild>
              <Link href="/kit" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                Plan your function
              </Link>
            </NavigationMenu.Link>
          </li>
          <li>
            <NavigationMenu.Link asChild>
              <Link href="/custom-orders" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                Custom & bulk orders
              </Link>
            </NavigationMenu.Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  className,
  children,
  badge,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface [&_svg]:size-[1.2rem] [&_svg]:stroke-[1.5]",
        className,
      )}
    >
      {children}
      {badge ? <CountBadge count={badge} /> : null}
    </button>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden
      className="absolute right-1 top-1 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-medium leading-none text-brand-ink"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const iconLink =
  "relative grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface [&_svg]:size-[1.2rem] [&_svg]:stroke-[1.5]";

function WishlistLink() {
  const count = wishlistStore.useStore((items) => items.length);
  return (
    <Link href="/wishlist" aria-label={`Wishlist${count ? `, ${count} items` : ""}`} className={cn(iconLink, "hidden sm:grid")}>
      <Heart />
      {count ? <CountBadge count={count} /> : null}
    </Link>
  );
}

function CartButton() {
  const count = cartStore.useStore(cartCount);
  return (
    <IconButton label={`Shopping bag${count ? `, ${count} items` : ", empty"}`} onClick={openCart} badge={count}>
      <ShoppingBag />
    </IconButton>
  );
}
