"use client";

import { adminOrders, customRequests, enquiries, type CustomRequest, type Enquiry } from "../data/admin";
import { categories, collections } from "../data/categories";
import { announcements, coupons, gallery, homepage, testimonials } from "../data/content";
import { products } from "../data/products";
import { storeSettings } from "../data/settings";
import type { Category, Collection, Coupon, ImageAsset, Order, Product, Review } from "../types";
import { createPersistedStore } from "./create-store";

/**
 * DEMO ADMIN STATE — a browser-local copy of the catalogue and operations
 * data so every admin screen is genuinely editable without a backend.
 * Each mutation here maps 1:1 to a future authenticated API call that the
 * server must authorise, validate and audit-log.
 */

export interface StockMovement {
  id: string;
  at: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  delta: number;
  reason: string;
}

export interface AdminState {
  version: 1;
  products: Product[];
  categories: Category[];
  collections: Collection[];
  orders: Order[];
  coupons: Coupon[];
  testimonials: Review[];
  gallery: { id: string; image: ImageAsset; href: string }[];
  announcements: { id: string; message: string; href?: string; isActive: boolean }[];
  hero: {
    eyebrow: string;
    titleLines: [string, string];
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  settings: {
    storeName: string;
    tagline: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    instagram: string;
    flatShipping: number;
    freeShippingThreshold: number | null;
    codEnabled: boolean;
    pricesIncludeTax: boolean;
    gstin: string;
  };
  stockMovements: StockMovement[];
  enquiries: Enquiry[];
  customRequests: CustomRequest[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function seedAdminState(): AdminState {
  return {
    version: 1,
    products: clone(products),
    categories: clone(categories),
    collections: clone(collections),
    orders: clone(adminOrders),
    coupons: clone(coupons),
    testimonials: clone(testimonials),
    gallery: clone(gallery),
    announcements: clone(announcements),
    hero: {
      eyebrow: homepage.hero.eyebrow,
      titleLines: [homepage.hero.titleLines[0], homepage.hero.titleLines[1]],
      description: homepage.hero.description,
      primaryCta: { ...homepage.hero.primaryCta },
      secondaryCta: { ...homepage.hero.secondaryCta },
    },
    settings: {
      storeName: storeSettings.name,
      tagline: storeSettings.tagline,
      email: storeSettings.contact.email ?? "",
      phone: storeSettings.contact.phone ?? "",
      whatsapp: storeSettings.contact.whatsapp ?? "",
      address: storeSettings.contact.addressLine ?? "",
      instagram: storeSettings.social.instagram,
      flatShipping: storeSettings.shipping.flatRate,
      freeShippingThreshold: storeSettings.shipping.freeShippingThreshold,
      codEnabled: storeSettings.payments.codEnabled,
      pricesIncludeTax: storeSettings.pricesIncludeTax,
      gstin: "",
    },
    stockMovements: [],
    enquiries: clone(enquiries),
    customRequests: clone(customRequests),
  };
}

const initial = seedAdminState();

export const adminStore = createPersistedStore<AdminState>(
  "ee.admin.v1",
  initial,
  (v): v is AdminState =>
    typeof v === "object" && v !== null && (v as AdminState).version === 1 && Array.isArray((v as AdminState).products),
);

export function resetAdminData() {
  adminStore.set(seedAdminState());
}

export function updateAdmin(mutator: (draft: AdminState) => void) {
  adminStore.set((prev) => {
    const next = clone(prev);
    mutator(next);
    return next;
  });
}
