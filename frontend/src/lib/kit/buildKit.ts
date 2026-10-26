import type { Paise } from "../types";
import {
  BUDGET_ROUNDING,
  EXTRA_STOCK_FACTOR,
  GUESTS_PER_TRAMI,
  prefVariantNames,
  tierDefaults,
  type KitCategory,
  type KitItem,
  type Occasion,
  type Tier,
} from "./config";
import { getKitCatalog } from "./catalog";

/**
 * Kit engine — pure functions, no React or storage. Given the shopper's
 * answers it returns every line of the kit, counted per trami.
 */

export interface KitPrefs {
  bio: boolean;
  printed: boolean;
  extra: boolean;
}

export interface KitOverride {
  variantIndex?: number;
  qty?: number;
  removed?: boolean;
}

export type KitOverrides = Record<string, KitOverride>;

/**
 * A line the shopper added on top of the suggested kit: another type of an
 * item that's already in it (wooden spoons as well as plastic ones), or an
 * item this occasion doesn't include.
 */
export interface KitAddition {
  id: string;
  itemId: string;
  variantIndex: number;
  qty: number;
}

export const KIT_ADDITIONS_MAX = 30;

export interface KitInput {
  occasion: Occasion;
  trami: number;
  /**
   * Set when the shopper counts by guests instead of trami: then every
   * per-person item is one per guest, and shared supplies scale with guests.
   */
  guests?: number;
  tier: Tier;
  prefs: KitPrefs;
  overrides?: KitOverrides;
  added?: KitAddition[];
}

export interface KitLine {
  /** Unique within the kit: the item id for suggested lines, `add:<id>` for added ones. */
  lineId: string;
  /** Set on lines the shopper added. */
  additionId?: string;
  itemId: string;
  name: string;
  category: KitCategory;
  variantIndex: number;
  defaultVariantIndex: number;
  qty: number;
  baseQty: number;
  unitPrice: Paise;
  /** 0 when the line is removed. */
  lineTotal: Paise;
  removed: boolean;
}

export const NO_PREFS: KitPrefs = { bio: false, printed: false, extra: false };

export function itemsFor(occasion: Occasion, items: KitItem[] = getKitCatalog().items): KitItem[] {
  return items.filter((i) => !i.occasions || i.occasions.includes(occasion));
}

/** How big the function is: trami, or (when counting by guests) the exact guest count. */
export type KitSize = { trami: number; guests?: number };

/**
 * The suggested quantity of an item. Counting by guests there are no
 * trami: anything used per place (plates, glasses, spoons, boxes — one or
 * more per trami) is one per guest; shared supplies (trash bags, foil…)
 * scale with the guest count.
 */
export function quantityFor(size: KitSize, perTrami: number, extra: boolean): number {
  if (!size.guests) return baseQuantity(size.trami, perTrami, extra);
  const perGuest = perTrami >= 1 ? 1 : perTrami / GUESTS_PER_TRAMI;
  const exact = Math.round(size.guests * perGuest * (extra ? EXTRA_STOCK_FACTOR : 1) * 1e6) / 1e6;
  return Math.max(1, Math.ceil(exact));
}

export function baseQuantity(trami: number, perTrami: number, extra: boolean): number {
  // Round before ceil so 50 × 0.1 × 1.1 (= 5.500000000000001) doesn't become 6.
  const exact = Math.round(trami * perTrami * (extra ? EXTRA_STOCK_FACTOR : 1) * 1e6) / 1e6;
  return Math.max(1, Math.ceil(exact));
}

export function defaultVariantIndex(item: KitItem, tier: Tier, prefs: KitPrefs): number {
  const last = item.variants.length - 1;
  const { index } = tierDefaults[tier];
  let chosen = index === "last" ? last : index > last ? last : index;

  const find = (names: readonly string[]) => item.variants.findIndex((v) => names.includes(v.name));
  if (prefs.bio) {
    const bio = find(prefVariantNames.bio);
    if (bio >= 0) chosen = bio;
  }
  if (prefs.printed) {
    const printed = find(prefVariantNames.printed);
    if (printed >= 0) chosen = printed;
  }
  return chosen;
}

export function buildKit(
  { occasion, trami, guests, tier, prefs, overrides = {}, added = [] }: KitInput,
  items: KitItem[] = getKitCatalog().items,
): KitLine[] {
  const suggested = itemsFor(occasion, items).map((item): KitLine => {
    const o = overrides[item.id] ?? {};
    const defaultIndex = defaultVariantIndex(item, tier, prefs);
    const variantIndex =
      o.variantIndex !== undefined && o.variantIndex >= 0 && o.variantIndex < item.variants.length ? o.variantIndex : defaultIndex;
    const baseQty = quantityFor({ trami, guests }, item.perTrami, prefs.extra);
    const qty = o.qty !== undefined ? Math.max(0, Math.round(o.qty)) : baseQty;
    const removed = o.removed ?? false;
    const unitPrice = item.variants[variantIndex].price;
    return {
      lineId: item.id,
      itemId: item.id,
      name: item.name,
      category: item.category,
      variantIndex,
      defaultVariantIndex: defaultIndex,
      qty,
      baseQty,
      unitPrice,
      lineTotal: removed ? 0 : unitPrice * qty,
      removed,
    };
  });

  const extra = added.slice(0, KIT_ADDITIONS_MAX).flatMap((a): KitLine[] => {
    const item = items.find((i) => i.id === a.itemId);
    if (!item) return [];
    const variantIndex = a.variantIndex >= 0 && a.variantIndex < item.variants.length ? a.variantIndex : 0;
    const qty = Math.max(1, Math.round(a.qty));
    const unitPrice = item.variants[variantIndex].price;
    return [
      {
        lineId: `add:${a.id}`,
        additionId: a.id,
        itemId: item.id,
        name: item.name,
        category: item.category,
        variantIndex,
        defaultVariantIndex: variantIndex,
        qty,
        baseQty: quantityFor({ trami, guests }, item.perTrami, prefs.extra),
        unitPrice,
        lineTotal: unitPrice * qty,
        removed: false,
      },
    ];
  });
  return [...suggested, ...extra];
}

/** The variants of an item already in the kit (on lines that aren't removed). */
export function variantsInKit(lines: KitLine[], itemId: string): Set<number> {
  return new Set(lines.filter((l) => l.itemId === itemId && !l.removed).map((l) => l.variantIndex));
}

/** Drops manual variant choices (keeping quantity and removal edits) so new tier/preference defaults show. */
export function withoutVariantOverrides(overrides: KitOverrides): KitOverrides {
  const out: KitOverrides = {};
  for (const [id, override] of Object.entries(overrides)) {
    const rest: KitOverride = { ...override };
    delete rest.variantIndex;
    if (Object.keys(rest).length) out[id] = rest;
  }
  return out;
}

export function kitTotal(lines: KitLine[]): Paise {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

/** Lines that would actually be bought. */
export function activeLines(lines: KitLine[]): KitLine[] {
  return lines.filter((l) => !l.removed && l.qty > 0);
}

/** Exact cost of one trami for a default kit, before any rounding up of quantities. */
export function perTramiCost(occasion: Occasion, tier: Tier, prefs: KitPrefs, items: KitItem[] = getKitCatalog().items): Paise {
  const factor = prefs.extra ? EXTRA_STOCK_FACTOR : 1;
  const cost = itemsFor(occasion, items).reduce(
    (sum, item) => sum + item.perTrami * factor * item.variants[defaultVariantIndex(item, tier, prefs)].price,
    0,
  );
  return Math.round(cost);
}

/** The tier's default kit total (no edits) for these answers, rounded up to the nearest ₹500. */
export function budgetFor(tier: Tier, answers: Omit<KitInput, "tier" | "overrides">, items: KitItem[] = getKitCatalog().items): Paise {
  const total = kitTotal(buildKit({ ...answers, tier }, items));
  return Math.ceil(total / BUDGET_ROUNDING) * BUDGET_ROUNDING;
}

export interface SwapSuggestion {
  itemId: string;
  name: string;
  fromIndex: number;
  toIndex: number;
  saving: Paise;
}

/** The lines where switching to the cheapest variant saves the most money. */
export function swapSuggestions(lines: KitLine[], limit = 2, items: KitItem[] = getKitCatalog().items): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];
  for (const line of activeLines(lines)) {
    if (line.additionId) continue; // the shopper chose these on purpose
    const item = items.find((i) => i.id === line.itemId);
    if (!item) continue;
    // Never suggest a type that's already its own line in the kit.
    const taken = variantsInKit(lines, line.itemId);
    const toIndex = item.variants.reduce(
      (best, v, i) => ((!taken.has(i) || i === line.variantIndex) && v.price < item.variants[best].price ? i : best),
      line.variantIndex,
    );
    const saving = (line.unitPrice - item.variants[toIndex].price) * line.qty;
    if (saving > 0) suggestions.push({ itemId: line.itemId, name: line.name, fromIndex: line.variantIndex, toIndex, saving });
  }
  return suggestions.sort((a, b) => b.saving - a.saving).slice(0, limit);
}
