"use client";

import { activeLines, budgetFor, buildKit, kitTotal } from "@/lib/kit/buildKit";
import { kitStore } from "@/lib/kit/store";

/** Current kit state plus everything derived from it. */
export function useKit() {
  const state = kitStore.useStore();
  const { occasion, trami, prefs, overrides } = state;
  // Until a tier is picked the kit previews the Standard defaults.
  const lines = occasion ? buildKit({ occasion, trami, tier: state.tier ?? "standard", prefs, overrides }) : [];
  const active = activeLines(lines);
  const total = kitTotal(lines);
  const budget = occasion && state.tier ? budgetFor(state.tier, { occasion, trami, prefs }) : null;
  return { state, lines, active, total, budget, perTrami: trami > 0 ? total / trami : 0 };
}
