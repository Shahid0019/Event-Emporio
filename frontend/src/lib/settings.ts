import type { ImageAsset, Paise, Review } from "./types";

/**
 * Settings the shop team changes from the admin (Settings page). Stored in
 * the database; brand constants (name, tagline, Instagram) stay in
 * data/settings.ts.
 */
export interface StoreSettings {
  contact: {
    email: string;
    phone: string;
    /** Digits with country code for WhatsApp links, e.g. 919876543210. */
    whatsapp: string;
    address: string;
  };
  shipping: {
    standard: Paise;
    express: Paise;
    /** Orders at or above this (after discount) ship free; null turns it off. */
    freeShippingThreshold: Paise | null;
  };
  payments: {
    codEnabled: boolean;
  };
  gstin: string;
}

export const defaultStoreSettings: StoreSettings = {
  contact: { email: "", phone: "", whatsapp: "", address: "" },
  shipping: { standard: 15000, express: 35000, freeShippingThreshold: 499900 },
  payments: { codEnabled: false },
  gstin: "",
};

export const SHIPPING_METHODS = [
  { id: "standard", label: "Standard delivery", description: "Dispatch timeline confirmed after order" },
  { id: "express", label: "Priority dispatch", description: "Packed and dispatched first" },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

export const shippingPrice = (s: StoreSettings, id: ShippingMethodId) => (id === "express" ? s.shipping.express : s.shipping.standard);

/* ------------------------------- Site content ------------------------------ */

export interface Announcement {
  id: string;
  message: string;
  href?: string;
  isActive: boolean;
}

export interface HeroContent {
  eyebrow: string;
  titleLines: [string, string];
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: ImageAsset;
}

/** Homepage/site content the shop team edits in the admin. */
export interface SiteContent {
  announcements: Announcement[];
  hero: HeroContent;
  testimonials: Review[];
}
