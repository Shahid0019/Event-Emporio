import type { Paise } from "../types";
import {
  BUDGET_ROUNDING,
  EXTRA_STOCK_FACTOR,
  kitItems as defaultItems,
  prefVariantNames,
  tierDefaults,
  type KitCategory,
  type KitItem,
  type Occasion,
  type Tier,
} from "./config";

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

export interface KitInput {
  occasion: Occasion;
  trami: number;
  tier: Tier;
  prefs: KitPrefs;
  overrides?: KitOverrides;
}

export interface KitLine {
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

export function itemsFor(occasion: Occasion, items: KitItem[] = defaultItems): KitItem[] {
  return items.filter((i) => !i.occasions || i.occasions.includes(occasion));
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

export function buildKit({ occasion, trami, tier, prefs, overrides = {} }: KitInput, items: KitItem[] = defaultItems): KitLine[] {
  return itemsFor(occasion, items).map((item) => {
    const o = overrides[item.id] ?? {};
    const defaultIndex = defaultVariantIndex(item, tier, prefs);
    const variantIndex =
      o.variantIndex !== undefined && o.variantIndex >= 0 && o.variantIndex < item.variants.length ? o.variantIndex : defaultIndex;
    const baseQty = baseQuantity(trami, item.perTrami, prefs.extra);
    const qty = o.qty !== undefined ? Math.max(0, Math.round(o.qty)) : baseQty;
    const removed = o.removed ?? false;
    const unitPrice = item.variants[variantIndex].price;
    return {
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
}

export function kitTotal(lines: KitLine[]): Paise {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

/** Lines that would actually be bought. */
export function activeLines(lines: KitLine[]): KitLine[] {
  return lines.filter((l) => !l.removed && l.qty > 0);
}

/** Exact cost of one trami for a default kit, before any rounding up of quantities. */
export function perTramiCost(occasion: Occasion, tier: Tier, prefs: KitPrefs, items: KitItem[] = defaultItems): Paise {
  const factor = prefs.extra ? EXTRA_STOCK_FACTOR : 1;
  const cost = itemsFor(occasion, items).reduce(
    (sum, item) => sum + item.perTrami * factor * item.variants[defaultVariantIndex(item, tier, prefs)].price,
    0,
  );
  return Math.round(cost);
}

/** The tier's default kit total (no edits) for these answers, rounded up to the nearest ₹500. */
export function budgetFor(tier: Tier, answers: Omit<KitInput, "tier" | "overrides">, items: KitItem[] = defaultItems): Paise {
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
export function swapSuggestions(lines: KitLine[], limit = 2, items: KitItem[] = defaultItems): SwapSuggestion[] {
  const suggestions: SwapSuggestion[] = [];
  for (const line of activeLines(lines)) {
    const item = items.find((i) => i.id === line.itemId);
    if (!item) continue;
    const toIndex = item.variants.reduce((best, v, i) => (v.price < item.variants[best].price ? i : best), 0);
    const saving = (line.unitPrice - item.variants[toIndex].price) * line.qty;
    if (saving > 0) suggestions.push({ itemId: line.itemId, name: line.name, fromIndex: line.variantIndex, toIndex, saving });
  }
  return suggestions.sort((a, b) => b.saving - a.saving).slice(0, limit);
}
