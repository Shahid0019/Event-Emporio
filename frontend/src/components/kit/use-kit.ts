"use client";

import { activeLines, budgetFor, buildKit, kitTotal } from "@/lib/kit/buildKit";
import { giftLines, giftsTotal } from "@/lib/kit/gifts";
import { kitStore } from "@/lib/kit/store";

/** Current kit state plus everything derived from it. */
export function useKit() {
  const state = kitStore.useStore();
  const { occasion, trami, guests, prefs, overrides, added } = state;
  // Until a tier is picked the kit previews the Standard defaults.
  const lines = occasion ? buildKit({ occasion, trami, guests, tier: state.tier ?? "standard", prefs, overrides, added }) : [];
  const active = activeLines(lines);
  const gifts = occasion ? giftLines(state.gifts) : [];
  // The tier budget is for the kit items; giveaways are on top.
  const itemsTotal = kitTotal(lines);
  const total = itemsTotal + giftsTotal(gifts);
  const budget = occasion && state.tier ? budgetFor(state.tier, { occasion, trami, guests, prefs }) : null;
  // Per guest when counted by guests, per trami otherwise.
  const perUnit = guests ? total / guests : trami > 0 ? total / trami : 0;
  return {
    state,
    lines,
    active,
    gifts,
    itemsTotal,
    total,
    budget,
    perTrami: trami > 0 ? total / trami : 0,
    perUnit,
    unit: guests ? "guest" : "trami",
  };
}
