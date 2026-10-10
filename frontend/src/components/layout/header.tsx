"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { NavigationMenu } from "radix-ui";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/ui/primitives";
import { mainNav } from "@/lib/site";
import { cartCount, cartStore, openCart, sessionStore, setMenuOpen, setSearchOpen, wishlistStore } from "@/lib/store";
import type { ImageAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MegaMenuData {
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  feature: { title: string; href: string; image: ImageAsset };
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
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent bg-canvas/0 transition-[background-color,border-color,backdrop-filter] duration-500 data-[scrolled]:border-line data-[scrolled]:bg-canvas/90 data-[scrolled]:backdrop-blur-md"
    >
      <div className="container-luxe grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: menu + search on mobile, logo on desktop */}
        <div className="flex items-center gap-1 lg:gap-0">
          <IconButton label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2.5 lg:hidden">
            <Menu />
          </IconButton>
          <IconButton label="Search" onClick={() => setSearchOpen(true)} className="lg:hidden">
            <Search />
          </IconButton>
          <Logo className="hidden lg:inline-flex" />
        </div>

        {/* Centre: logo on mobile, navigation on desktop */}
        <div className="flex justify-center">
          <Logo className="lg:hidden" />
          <Suspense fallback={<DesktopNav menu={menu} pathname={null} />}>
            <DesktopNavWithPath menu={menu} />
          </Suspense>
        </div>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <IconButton label="Search" onClick={() => setSearchOpen(true)} className="hidden lg:grid">
            <Search />
          </IconButton>
          <AccountLink />
          <WishlistLink />
          <CartButton />
        </div>
      </div>
    </header>
  );
}

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
  "relative inline-flex h-10 items-center px-3.5 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:text-brand data-[active]:text-brand after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[var(--ease-luxe)] hover:after:scale-x-100 data-[active]:after:scale-x-100 xl:px-4 xl:after:inset-x-4";

function DesktopNav({ menu, pathname }: { menu: MegaMenuData; pathname: string | null }) {
  return (
    <NavigationMenu.Root className="hidden lg:block" delayDuration={80}>
      <NavigationMenu.List className="flex items-center">
        {mainNav.map((item) =>
          "mega" in item ? (
            <NavigationMenu.Item key={item.href}>
              <NavigationMenu.Trigger className={navLink} data-active={isActive(pathname, item.href) || undefined}>
                {item.label}
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
        <NavigationMenu.Viewport className="mx-auto w-[calc(100%-2*var(--gutter))] max-w-[calc(92rem-2*var(--gutter))] origin-top overflow-hidden rounded-b-media border border-t-0 border-line bg-canvas shadow-[0_30px_60px_-30px_rgb(36_32_32/0.25)] data-[state=open]:animate-overlay-in" />
      </div>
    </NavigationMenu.Root>
  );
}

function MegaMenu({ menu }: { menu: MegaMenuData }) {
  return (
    <div className="container-luxe grid grid-cols-12 gap-10 py-12">
      <div className="col-span-4">
        <p className="eyebrow mb-6 text-accent-ink">Shop by category</p>
        <ul className="space-y-1">
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
      <div className="col-span-3 border-l border-line pl-10">
        <p className="eyebrow mb-6 text-accent-ink">Collections</p>
        <ul className="space-y-3">
          {menu.collections.map((c) => (
            <li key={c.slug}>
              <NavigationMenu.Link asChild>
                <Link href={`/collections/${c.slug}`} className="text-[0.95rem] text-ink transition-colors hover:text-brand">
                  {c.name}
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
          <li className="pt-4">
            <NavigationMenu.Link asChild>
              <Link href="/shop" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                Shop all products
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
      <NavigationMenu.Link asChild>
        <Link href={menu.feature.href} className="group relative col-span-5 block aspect-[16/10] overflow-hidden rounded-media bg-surface">
          <Image
            src={menu.feature.image.src}
            alt={menu.feature.image.alt}
            fill
            sizes="40vw"
            className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0" />
          <span className="absolute inset-x-6 bottom-6 flex items-end justify-between text-canvas">
            <span>
              <span className="eyebrow block text-canvas/80">Featured</span>
              <span className="mt-2 block font-serif text-3xl">{menu.feature.title}</span>
            </span>
            <ArrowRight className="size-5" />
          </span>
        </Link>
      </NavigationMenu.Link>
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

function AccountLink() {
  const user = sessionStore.useStore();
  return (
    <Link href={user ? "/account" : "/login"} aria-label={user ? "My account" : "Sign in"} className={cn(iconLink, "hidden sm:grid")}>
      <User />
    </Link>
  );
}

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
    <IconButton label={`Shopping bag${count ? `, ${count} items` : ", empty"}`} onClick={openCart} className="-mr-2.5" badge={count}>
      <ShoppingBag />
    </IconButton>
  );
}
