"use client";

import { cartItemCount } from "../cart-groups";
import { lineCap, MAX_LINE_QUANTITY } from "../pricing";
import type { CartBundle, CartLine, ImageAsset } from "../types";
import { createPersistedStore, createUIStore, isArray } from "./create-store";

/* -------------------------------- Cart -------------------------------- */
/**
 * Guest cart persisted in the browser. Prices here are display snapshots
 * only — the server recalculates every price, discount and stock level
 * before creating a payment order.
 */
export const cartStore = createPersistedStore<CartLine[]>("ee.cart.v1", [], isArray as (v: unknown) => v is CartLine[]);

export { MAX_LINE_QUANTITY };

export function addToCart(line: Omit<CartLine, "key">) {
  const key = `${line.productId}:${line.variantId}`;
  let added = 0;
  cartStore.set((lines) => {
    const existing = lines.find((l) => l.key === key);
    const cap = lineCap(line.maxQuantity, line.maxPerOrder);
    if (existing) {
      const quantity = Math.min(existing.quantity + line.quantity, cap);
      added = quantity - existing.quantity;
      return lines.map((l) => (l.key === key ? { ...l, quantity, giftMessage: line.giftMessage ?? l.giftMessage } : l));
    }
    added = Math.min(line.quantity, cap);
    return [...lines, { ...line, key, quantity: added }];
  });
  return added;
}

export function updateCartQuantity(key: string, quantity: number) {
  cartStore.set((lines) =>
    lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(quantity, lineCap(l.maxQuantity, l.maxPerOrder))) } : l)),
  );
}

export function removeFromCart(key: string) {
  cartStore.set((lines) => lines.filter((l) => l.key !== key));
}

export function clearCart() {
  cartStore.set([]);
}

/** Items in the bag: each kit counts once, single products by quantity. */
export const cartCount = cartItemCount;

/**
 * Puts a whole kit in the bag as one item. Called again with the same bundle
 * id (after "Edit kit"), it replaces that kit in place instead of adding a
 * second one.
 */
export function putKitInCart(bundle: CartBundle, items: Omit<CartLine, "key" | "bundle">[]) {
  cartStore.set((lines) => {
    const kitLines: CartLine[] = items.map((item) => ({
      ...item,
      bundle,
      key: `${bundle.id}:${item.productId}:${item.variantId}`,
      quantity: Math.max(1, Math.min(item.quantity, lineCap(item.maxQuantity, item.maxPerOrder))),
    }));
    const firstIndex = lines.findIndex((l) => l.bundle?.id === bundle.id);
    const others = lines.filter((l) => l.bundle?.id !== bundle.id);
    if (firstIndex < 0) return [...others, ...kitLines];
    const at = lines.slice(0, firstIndex).filter((l) => l.bundle?.id !== bundle.id).length;
    return [...others.slice(0, at), ...kitLines, ...others.slice(at)];
  });
}

export function removeKitFromCart(bundleId: string) {
  cartStore.set((lines) => lines.filter((l) => l.bundle?.id !== bundleId));
}

export const kitInCart = (bundleId: string | undefined) =>
  bundleId ? cartStore.get().find((l) => l.bundle?.id === bundleId)?.bundle : undefined;

/** Code the shopper typed; it is re-validated on every render and again by the server at checkout. */
export const couponStore = createPersistedStore<string | null>(
  "ee.coupon.v1",
  null,
  (v): v is string | null => v === null || typeof v === "string",
);

/* ------------------------------ Wishlist ------------------------------ */
export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  image: ImageAsset;
  price: number;
}

export const wishlistStore = createPersistedStore<WishlistItem[]>("ee.wishlist.v1", [], isArray as (v: unknown) => v is WishlistItem[]);

export function toggleWishlist(item: WishlistItem): boolean {
  let added = false;
  wishlistStore.set((items) => {
    if (items.some((i) => i.productId === item.productId)) return items.filter((i) => i.productId !== item.productId);
    added = true;
    return [item, ...items];
  });
  return added;
}

/* ------------------------------- Session ------------------------------ */
/**
 * The signed-in customer's name and email, remembered for the header and
 * form prefill. The real session is an HTTP-only cookie checked by the
 * server on every account request; <StoreDataProvider> re-checks this copy
 * against the server on each visit.
 */
export interface SessionUser {
  name: string;
  email: string;
  phone?: string;
}

export const sessionStore = createPersistedStore<SessionUser | null>(
  "ee.session.v1",
  null,
  (v): v is SessionUser | null => v === null || (typeof v === "object" && v !== null && "email" in v),
);

export const signIn = (user: SessionUser) => sessionStore.set(user);

export function signOut() {
  sessionStore.set(null);
  void fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
}

/* --------------------------- Recently viewed -------------------------- */
export const recentStore = createPersistedStore<string[]>("ee.recent.v1", [], isArray as (v: unknown) => v is string[]);

export function rememberViewed(slug: string) {
  recentStore.set((list) => [slug, ...list.filter((s) => s !== slug)].slice(0, 8));
}

/* ------------------------------- UI state ----------------------------- */
export const uiStore = createUIStore({ cartOpen: false, searchOpen: false, menuOpen: false });

export const openCart = () => uiStore.set((s) => ({ ...s, cartOpen: true, searchOpen: false, menuOpen: false }));
export const setCartOpen = (cartOpen: boolean) => uiStore.set((s) => ({ ...s, cartOpen }));
export const setSearchOpen = (searchOpen: boolean) => uiStore.set((s) => ({ ...s, searchOpen, menuOpen: false }));
export const setMenuOpen = (menuOpen: boolean) => uiStore.set((s) => ({ ...s, menuOpen }));
