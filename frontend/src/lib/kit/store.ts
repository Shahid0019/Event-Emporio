"use client";

import { createPersistedStore, createUIStore } from "../store/create-store";
import { NO_PREFS, type KitOverride, type KitOverrides, type KitPrefs } from "./buildKit";
import { DATE_IDS, OCCASION_IDS, TIER_IDS, TRAMI, type FunctionDate, type Occasion, type Tier } from "./config";
import { clampTrami, kitQueryString, parseKitQuery, readyKitById, type KitQuery } from "./url";

/**
 * Kit builder state, persisted in this browser (refresh keeps the kit).
 * The chat transcript is derived from these answers, not stored.
 *
 * Steps: 0 occasion · 1 trami · 2 date · 3 tier · 4 preferences · 5 done
 */

export type KitStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface KitState {
  version: 1;
  occasion: Occasion | null;
  trami: number;
  date: FunctionDate | null;
  tier: Tier | null;
  prefs: KitPrefs;
  overrides: KitOverrides;
  /** The step whose controls are showing (an earlier one while re-answering). */
  step: KitStep;
  /** The furthest step reached; every step before it is answered. */
  furthest: KitStep;
  /** True after "Add all to cart" until the kit is edited again. */
  inCart: boolean;
  /** Shop has said thanks for adding to cart (kept until start over). */
  thanked: boolean;
}

export const initialKitState: KitState = {
  version: 1,
  occasion: null,
  trami: TRAMI.default,
  date: null,
  tier: null,
  prefs: NO_PREFS,
  overrides: {},
  step: 0,
  furthest: 0,
  inCart: false,
  thanked: false,
};

const isStep = (v: unknown): v is KitStep => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T | null => v === null || list.includes(v as T);

function isKitState(v: unknown): v is KitState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    s.version === 1 &&
    oneOf(OCCASION_IDS, s.occasion) &&
    typeof s.trami === "number" &&
    oneOf(DATE_IDS, s.date) &&
    oneOf(TIER_IDS, s.tier) &&
    typeof s.prefs === "object" &&
    s.prefs !== null &&
    typeof s.overrides === "object" &&
    s.overrides !== null &&
    isStep(s.step) &&
    isStep(s.furthest) &&
    typeof s.inCart === "boolean" &&
    typeof s.thanked === "boolean"
  );
}

export const kitStore = createPersistedStore<KitState>("ee.kit.v1", initialKitState, isKitState);

/* --------------------------- Typing indicator ------------------------ */

/** True for ~500ms before a new shop message appears. Skipped for reduced motion. */
export const kitTypingStore = createUIStore(false);
let typingTimer: ReturnType<typeof setTimeout> | undefined;

function announce() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  clearTimeout(typingTimer);
  kitTypingStore.set(true);
  typingTimer = setTimeout(() => kitTypingStore.set(false), 500);
}

/* ------------------------------ Answers ------------------------------ */

/** Any change to the kit takes it out of the "in cart" state. */
function edit(updater: (s: KitState) => Partial<KitState>) {
  const before = kitStore.get().furthest;
  kitStore.set((s) => ({ ...s, ...updater(s), inCart: false }));
  if (kitStore.get().furthest > before) announce();
}

/** After answering `answered`, move to the next step — or back to the furthest one if re-answering. */
function nextSteps(s: KitState, answered: KitStep): Pick<KitState, "step" | "furthest"> {
  if (answered < s.furthest) return { step: s.furthest, furthest: s.furthest };
  const next = Math.min(answered + 1, 5) as KitStep;
  return { step: next, furthest: next };
}

/** Variant overrides are dropped when the tier or preferences change, so the new defaults show. */
function withoutVariantOverrides(overrides: KitOverrides): KitOverrides {
  const out: KitOverrides = {};
  for (const [id, override] of Object.entries(overrides)) {
    const rest: KitOverride = { ...override };
    delete rest.variantIndex;
    if (Object.keys(rest).length) out[id] = rest;
  }
  return out;
}

export const answerOccasion = (occasion: Occasion) => edit((s) => ({ occasion, ...nextSteps(s, 0) }));

export const setTrami = (trami: number) => edit(() => ({ trami: clampTrami(trami) }));
export const confirmTrami = () => edit((s) => nextSteps(s, 1));

export const answerDate = (date: FunctionDate) => edit((s) => ({ date, ...nextSteps(s, 2) }));

export const answerTier = (tier: Tier) => edit((s) => ({ tier, overrides: withoutVariantOverrides(s.overrides), ...nextSteps(s, 3) }));

export const togglePref = (key: keyof KitPrefs) =>
  edit((s) => ({ prefs: { ...s.prefs, [key]: !s.prefs[key] }, overrides: withoutVariantOverrides(s.overrides) }));
export const confirmPrefs = () => edit((s) => nextSteps(s, 4));

/** Tap an earlier answer bubble to change it. */
export const reopenStep = (step: KitStep) => kitStore.set((s) => (step < s.furthest ? { ...s, step } : s));
export const cancelReopen = () => kitStore.set((s) => ({ ...s, step: s.furthest }));

export function startOver() {
  kitStore.set(initialKitState);
  kitChatHiddenStore.set(false);
}

/**
 * Whether the shopper minimised the chat. Kept in its own store so toggling
 * it re-renders only the layout, not every kit row.
 */
export const kitChatHiddenStore = createPersistedStore<boolean>(
  "ee.kit.chat-hidden.v1",
  false,
  (v): v is boolean => typeof v === "boolean",
);
export const setChatHidden = (hidden: boolean) => kitChatHiddenStore.set(hidden);

/* ------------------------------ Kit edits ---------------------------- */

function patchItem(itemId: string, patch: KitOverride) {
  edit((s) => ({ overrides: { ...s.overrides, [itemId]: { ...s.overrides[itemId], ...patch } } }));
}

export const setVariant = (itemId: string, variantIndex: number) => patchItem(itemId, { variantIndex });
export const setQty = (itemId: string, qty: number) => patchItem(itemId, { qty: Math.max(1, Math.round(qty)) });
/** Back to the per-trami suggestion. */
export const resetQty = (itemId: string) => patchItem(itemId, { qty: undefined });
export const removeItem = (itemId: string) => patchItem(itemId, { removed: true });
export const restoreItem = (itemId: string) => patchItem(itemId, { removed: false });

export function markKitInCart() {
  const alreadyThanked = kitStore.get().thanked;
  kitStore.set((s) => ({ ...s, inCart: true, thanked: true }));
  if (!alreadyThanked) announce();
}

/* -------------------------------- URL -------------------------------- */

export function queryOf(s: KitState): KitQuery {
  return { occasion: s.occasion, trami: s.furthest > 1 ? s.trami : null, tier: s.tier, prefs: s.prefs };
}

/**
 * Loads `?ready=…`, `?occasion=…` or a shared `?occasion&trami&tier` link.
 * A URL that already matches the saved kit (a refresh) keeps the saved
 * edits; anything else starts a fresh kit from the link.
 */
export function applyKitParams(params: URLSearchParams) {
  const ready = readyKitById(params.get("ready"));
  if (ready) {
    kitStore.set({
      ...initialKitState,
      occasion: ready.occasion,
      trami: ready.trami,
      tier: ready.tier,
      date: "undecided",
      step: 5,
      furthest: 5,
    });
    return;
  }

  const q = parseKitQuery(params);
  if (!q.occasion) return;
  if (kitQueryString(q) === kitQueryString(queryOf(kitStore.get()))) return;

  const done: KitStep = q.tier ? 5 : q.trami !== null ? 2 : 1;
  kitStore.set({
    ...initialKitState,
    occasion: q.occasion,
    trami: q.trami ?? TRAMI.default,
    tier: q.tier,
    prefs: q.prefs,
    date: done === 5 ? "undecided" : null,
    step: done,
    furthest: done,
  });
}
