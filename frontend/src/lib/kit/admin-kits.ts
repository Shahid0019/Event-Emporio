import { NO_PREFS, type KitAddition, type KitOverrides, type KitPrefs } from "./buildKit";
import { activeKitFunctions } from "./catalog";
import { CUSTOM_FUNCTION, type FunctionDate, type Occasion, type Tier } from "./config";
import type { SharedKit } from "./shared";

/**
 * Kits the shop builds for individual customers (Admin → Customer kits).
 * Stored in the database; the customer receives the kit through its link,
 * which carries the whole kit, so it opens on any device.
 */
export interface AdminKit {
  id: string;
  customerName: string;
  customerPhone: string;
  note: string;
  occasion: Occasion;
  /** The customer's own name for the function ("Sana ki Mehndi"); shown to them and in the bag. */
  title?: string;
  trami: number;
  tier: Tier;
  date: FunctionDate | null;
  prefs: KitPrefs;
  overrides: KitOverrides;
  /** Lines the shop added on top of the suggested kit. */
  added?: KitAddition[];
  /** "sent" once the link was copied or shared. */
  status: "draft" | "sent";
  createdAt: string;
  updatedAt: string;
}

export function blankAdminKit(): AdminKit {
  const now = new Date().toISOString();
  return {
    id: "",
    customerName: "",
    customerPhone: "",
    note: "",
    occasion: activeKitFunctions()[0]?.id ?? CUSTOM_FUNCTION,
    trami: 50,
    tier: "standard",
    date: null,
    prefs: NO_PREFS,
    overrides: {},
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function toSharedKit(
  k: Pick<AdminKit, "occasion" | "title" | "trami" | "tier" | "prefs" | "date" | "overrides" | "added"> & {
    customerName?: string;
    note?: string;
  },
): SharedKit {
  return {
    occasion: k.occasion,
    ...(k.title?.trim() && { title: k.title.trim() }),
    trami: k.trami,
    tier: k.tier,
    prefs: k.prefs,
    date: k.date,
    overrides: k.overrides,
    ...(k.added?.length && { added: k.added }),
    customerName: k.customerName,
    note: k.note,
  };
}

/** wa.me needs digits with a country code; bare 10-digit Indian numbers get +91. */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}
