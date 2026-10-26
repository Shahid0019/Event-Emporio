"use client";

import { createPersistedStore, createUIStore } from "../store/create-store";
import {
  quantityFor,
  buildKit,
  KIT_ADDITIONS_MAX,
  NO_PREFS,
  withoutVariantOverrides,
  type KitAddition,
  type KitOverride,
  type KitOverrides,
  type KitPrefs,
} from "./buildKit";
import { kitItemById } from "./catalog";
import { DATE_IDS, FUNCTION_TITLE_MAX, GUESTS_PER_TRAMI, TIER_IDS, TRAMI, type FunctionDate, type Occasion, type Tier } from "./config";
import { KIT_GIFTS_MAX, type KitGift } from "./gifts";
import { decodeSharedKit, type SharedKit } from "./shared";
import { kitInCart } from "../store";
import { clampTrami, cleanTitle, kitQueryString, parseKitQuery, type KitQuery } from "./url";

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
  /** The shopper's own name for the function ("Sana ki Mehndi"). */
  title?: string;
  trami: number;
  date: FunctionDate | null;
  /** The exact function date (YYYY-MM-DD) when the shopper picked one. */
  eventDate?: string;
  tier: Tier | null;
  prefs: KitPrefs;
  overrides: KitOverrides;
  /** Lines the shopper added on top of the suggested kit. */
  added?: KitAddition[];
  /** Shop products added as giveaways for the guests. */
  gifts?: KitGift[];
  /** How the shopper answered "how many": trami, or guests. */
  countBy?: "trami" | "guests";
  /** Set while counting by guests: one of each per-person item per guest (no trami). */
  guests?: number;
  /** The step whose controls are showing (an earlier one while re-answering). */
  step: KitStep;
  /** The furthest step reached; every step before it is answered. */
  furthest: KitStep;
  /** True after "Add all to cart" until the kit is edited again. */
  inCart: boolean;
  /** Shop has said thanks for adding to cart (kept until start over). */
  thanked: boolean;
  /** Set when the shop prepared this kit for a customer (from a `?k=` link). */
  preparedFor?: string;
  /** Message from the shop that came with a prepared kit. */
  shopNote?: string;
  /** True for any kit that came from the shop, even without a name. */
  fromShop?: boolean;
  /** The kit's id in the bag once added, so later edits update that same kit. */
  cartBundleId?: string;
  /** Set when this kit came from (or was saved to) the shopper's saved kits. */
  savedId?: string;
}

export const initialKitState: KitState = {
  version: 1,
  occasion: null,
  trami: TRAMI.default,
  date: null,
  tier: null,
  prefs: NO_PREFS,
  overrides: {},
  added: [],
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
    (s.occasion === null || typeof s.occasion === "string") &&
    (s.title === undefined || (typeof s.title === "string" && s.title.length <= FUNCTION_TITLE_MAX)) &&
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
    typeof s.thanked === "boolean" &&
    (s.preparedFor === undefined || typeof s.preparedFor === "string") &&
    (s.shopNote === undefined || typeof s.shopNote === "string") &&
    (s.fromShop === undefined || typeof s.fromShop === "boolean") &&
    (s.cartBundleId === undefined || typeof s.cartBundleId === "string") &&
    (s.savedId === undefined || typeof s.savedId === "string") &&
    (s.added === undefined || Array.isArray(s.added)) &&
    (s.gifts === undefined || Array.isArray(s.gifts)) &&
    (s.countBy === undefined || s.countBy === "trami" || s.countBy === "guests") &&
    (s.guests === undefined || (typeof s.guests === "number" && s.guests > 0)) &&
    (s.eventDate === undefined || (typeof s.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.eventDate)))
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

/** Picks the function (and, optionally, the shopper's own name for it). */
export const answerOccasion = (occasion: Occasion, title?: string) =>
  edit((s) => ({ occasion, title: cleanTitle(title), ...nextSteps(s, 0) }));

/** Names (or renames) the function at any time; empty clears the name. */
export const setKitTitle = (title: string) => edit(() => ({ title: cleanTitle(title) }));

export const setTrami = (trami: number) => edit(() => ({ trami: clampTrami(trami), guests: undefined, countBy: "trami" }));

/** Counting by guests: quantities go per person; trami (guests ÷ 4, rounded up) is kept only for budgets and links. */
export const MAX_GUESTS = TRAMI.max * GUESTS_PER_TRAMI;
export const setGuests = (guests: number) => {
  const n = Math.min(MAX_GUESTS, Math.max(1, Math.round(guests)));
  edit(() => ({ guests: n, countBy: "guests", trami: clampTrami(Math.ceil(n / GUESTS_PER_TRAMI)) }));
};
/** Switching keeps the size: 50 trami ↔ 200 guests. */
export const setCountBy = (countBy: "trami" | "guests") =>
  edit((s) => (countBy === "guests" ? { countBy, guests: s.guests ?? s.trami * GUESTS_PER_TRAMI } : { countBy, guests: undefined }));
/** Guests for this kit: the number typed, or four per trami. */
export const guestsOf = (s: Pick<KitState, "guests" | "trami">) => s.guests ?? s.trami * GUESTS_PER_TRAMI;
export const confirmTrami = () => edit((s) => nextSteps(s, 1));

export const answerDate = (date: FunctionDate) => edit((s) => ({ date, eventDate: undefined, ...nextSteps(s, 2) }));

/** Days from today (local time) to a YYYY-MM-DD date. */
export function daysUntil(isoDate: string, today = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86_400_000);
}

/** An exact date also answers "when" in the usual buckets (so delivery hints still work). */
export function bucketForDate(isoDate: string, today = new Date()): FunctionDate {
  const days = daysUntil(isoDate, today);
  return days <= 7 ? "this-week" : days <= 14 ? "two-weeks" : "next-month";
}

export const answerExactDate = (isoDate: string) => edit((s) => ({ date: bucketForDate(isoDate), eventDate: isoDate, ...nextSteps(s, 2) }));

/** Go back one question; answers are kept and re-answering returns to where the shopper was. */
export const goBack = () => kitStore.set((s) => (s.step > 0 ? { ...s, step: (s.step - 1) as KitStep } : s));

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

/* --------------------------- Added items ----------------------------- */

export type AddResult =
  { kind: "added"; lineId: string } | { kind: "restored"; lineId: string } | { kind: "exists"; lineId: string } | { kind: "full" };

/**
 * Adds an item (in the chosen type) to the kit. If that exact item and type
 * is already a line, nothing is added and that line is returned instead; if
 * it's a suggested item the shopper removed, it's put back in that type.
 */
export function addToKit(itemId: string, variantIndex: number, qty?: number): AddResult {
  const s = kitStore.get();
  const item = kitItemById(itemId);
  if (!s.occasion || !item) return { kind: "full" };
  const lines = buildKit({
    occasion: s.occasion,
    trami: s.trami,
    guests: s.guests,
    tier: s.tier ?? "standard",
    prefs: s.prefs,
    overrides: s.overrides,
    added: s.added,
  });

  const same = lines.find((l) => l.itemId === itemId && l.variantIndex === variantIndex && !l.removed);
  if (same) return { kind: "exists", lineId: same.lineId };

  const suggested = lines.find((l) => !l.additionId && l.itemId === itemId);
  if (suggested?.removed) {
    patchItem(itemId, { removed: false, variantIndex });
    return { kind: "restored", lineId: suggested.lineId };
  }

  const added = s.added ?? [];
  if (added.length >= KIT_ADDITIONS_MAX) return { kind: "full" };
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const amount = Math.max(1, Math.round(qty ?? quantityFor({ trami: s.trami, guests: s.guests }, item.perTrami, s.prefs.extra)));
  edit(() => ({ added: [...added, { id, itemId, variantIndex, qty: amount }] }));
  return { kind: "added", lineId: `add:${id}` };
}

function patchAddition(id: string, patch: Partial<Pick<KitAddition, "variantIndex" | "qty">>) {
  edit((s) => ({ added: (s.added ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

export const setAddedVariant = (id: string, variantIndex: number) => patchAddition(id, { variantIndex });
export const setAddedQty = (id: string, qty: number) => patchAddition(id, { qty: Math.max(1, Math.round(qty)) });

/** Removes an added line. Returns it so it can be put back (Undo). */
export function removeAddition(id: string): KitAddition | undefined {
  const line = (kitStore.get().added ?? []).find((a) => a.id === id);
  edit((s) => ({ added: (s.added ?? []).filter((a) => a.id !== id) }));
  return line;
}

export function restoreAddition(line: KitAddition) {
  edit((s) => ({ added: [...(s.added ?? []).filter((a) => a.id !== line.id), line] }));
}

export function restoreAdditions(lines: KitAddition[]) {
  const ids = new Set(lines.map((l) => l.id));
  edit((s) => ({ added: [...(s.added ?? []).filter((a) => !ids.has(a.id)), ...lines] }));
}

/**
 * Takes one type of a suggested item out of the kit while other types of it
 * stay: the first added type moves onto the suggested line. With no other
 * types, the item goes to the removed tray.
 */
export function dropSuggestedType(itemId: string) {
  const other = (kitStore.get().added ?? []).find((a) => a.itemId === itemId);
  if (!other) return removeItem(itemId);
  edit((s) => ({
    overrides: { ...s.overrides, [itemId]: { ...s.overrides[itemId], variantIndex: other.variantIndex, qty: other.qty, removed: false } },
    added: (s.added ?? []).filter((a) => a.id !== other.id),
  }));
}

/** Removes every type of an item: the suggested line goes to the removed tray, added lines are returned for Undo. */
export function removeWholeItem(itemId: string): KitAddition[] {
  const gone = (kitStore.get().added ?? []).filter((a) => a.itemId === itemId);
  edit((s) => ({
    overrides:
      s.overrides[itemId] || isSuggested(s, itemId) ? { ...s.overrides, [itemId]: { ...s.overrides[itemId], removed: true } } : s.overrides,
    added: (s.added ?? []).filter((a) => a.itemId !== itemId),
  }));
  return gone;
}

const isSuggested = (s: KitState, itemId: string) =>
  !!s.occasion &&
  buildKit({ occasion: s.occasion, trami: s.trami, guests: s.guests, tier: s.tier ?? "standard", prefs: s.prefs }).some(
    (l) => l.itemId === itemId,
  );

/* ----------------------------- Giveaways ----------------------------- */

export type GiftAddResult = "added" | "exists" | "full";

/** Adds a shop product as a giveaway; the same product and option twice just keeps the first. */
export function addGift(productId: string, variantId: string, qty: number): GiftAddResult {
  const gifts = kitStore.get().gifts ?? [];
  if (gifts.some((g) => g.productId === productId && g.variantId === variantId)) return "exists";
  if (gifts.length >= KIT_GIFTS_MAX) return "full";
  edit(() => ({ gifts: [...gifts, { productId, variantId, qty: Math.max(1, Math.round(qty)) }] }));
  return "added";
}

const sameGift = (g: KitGift, productId: string, variantId: string) => g.productId === productId && g.variantId === variantId;

export const setGiftQty = (productId: string, variantId: string, qty: number) =>
  edit((s) => ({
    gifts: (s.gifts ?? []).map((g) => (sameGift(g, productId, variantId) ? { ...g, qty: Math.max(1, Math.round(qty)) } : g)),
  }));

export const setGiftVariant = (productId: string, from: string, to: string) =>
  edit((s) => ({
    gifts: (s.gifts ?? []).some((g) => sameGift(g, productId, to))
      ? s.gifts
      : (s.gifts ?? []).map((g) => (sameGift(g, productId, from) ? { ...g, variantId: to } : g)),
  }));

/** Removes a giveaway; returns it so it can be put back (Undo). */
export function removeGift(productId: string, variantId: string): KitGift | undefined {
  const gift = (kitStore.get().gifts ?? []).find((g) => sameGift(g, productId, variantId));
  edit((s) => ({ gifts: (s.gifts ?? []).filter((g) => !sameGift(g, productId, variantId)) }));
  return gift;
}

export const restoreGift = (gift: KitGift) =>
  edit((s) => ({ gifts: [...(s.gifts ?? []).filter((g) => !sameGift(g, gift.productId, gift.variantId)), gift] }));

/** The giveaway picker can be opened from the chat and from the kit. */
export const giftSheetStore = createUIStore(false);
export const openGiftSheet = () => giftSheetStore.set(true);

export function markKitInCart(cartBundleId: string) {
  const alreadyThanked = kitStore.get().thanked;
  kitStore.set((s) => ({ ...s, inCart: true, thanked: true, cartBundleId }));
  if (!alreadyThanked) announce();
}

/** The current kit in the portable format used by links, the bag and saved kits. */
export function sharedKitOf(s: KitState): SharedKit | null {
  if (!s.occasion) return null;
  return {
    occasion: s.occasion,
    ...(s.title && { title: s.title }),
    trami: s.trami,
    ...(s.guests && { guests: s.guests }),
    tier: s.tier ?? "standard",
    prefs: s.prefs,
    date: s.date,
    overrides: s.overrides,
    ...(s.added?.length && { added: s.added }),
    ...(s.gifts?.length && { gifts: s.gifts }),
  };
}

/** Opens a complete kit (from the bag or a saved kit) at the "done" step. */
export function loadCompleteKit(kit: SharedKit, extra: Partial<KitState> = {}) {
  kitStore.set({
    ...initialKitState,
    occasion: kit.occasion,
    title: cleanTitle(kit.title),
    trami: kit.trami,
    guests: kit.guests,
    countBy: kit.guests ? "guests" : "trami",
    tier: kit.tier,
    prefs: kit.prefs,
    date: kit.date ?? "undecided",
    overrides: kit.overrides,
    added: kit.added ?? [],
    gifts: kit.gifts ?? [],
    step: 5,
    furthest: 5,
    ...extra,
  });
  // A finished kit opens with the chat tucked away; it's one tap to reopen.
  kitChatHiddenStore.set(true);
}

/* -------------------------------- URL -------------------------------- */

export function queryOf(s: KitState): KitQuery {
  return {
    occasion: s.occasion,
    title: s.title,
    trami: s.furthest > 1 ? s.trami : null,
    ...(s.furthest > 1 && s.guests && { guests: s.guests }),
    tier: s.tier,
    prefs: s.prefs,
  };
}

/**
 * Loads `?occasion=…` or a shared `?occasion&trami&tier` link.
 * A URL that already matches the saved kit (a refresh) keeps the saved
 * edits; anything else starts a fresh kit from the link.
 */
export function applyKitParams(params: URLSearchParams) {
  // "Edit kit" from the bag: reopen exactly that kit, tied to it so saving updates it in place.
  const editId = params.get("edit");
  if (editId) {
    const bundle = kitInCart(editId);
    const kit = decodeSharedKit(bundle?.kit);
    if (bundle && kit) {
      if (kitStore.get().cartBundleId !== editId)
        loadCompleteKit(kit, { cartBundleId: editId, inCart: true });
      else kitChatHiddenStore.set(true);
      return;
    }
  }

  // A kit the shop prepared for this customer. Malformed links are ignored.
  const shared = decodeSharedKit(params.get("k"));
  if (shared) {
    loadCompleteKit(shared, { fromShop: true, preparedFor: shared.customerName, shopNote: shared.note });
    // Keep the chat open here: it carries the shop's personal message.
    kitChatHiddenStore.set(false);
    return;
  }

  const q = parseKitQuery(params);
  if (!q.occasion) return;
  if (kitQueryString(q) === kitQueryString(queryOf(kitStore.get()))) return;

  const done: KitStep = q.tier ? 5 : q.trami !== null ? 2 : 1;
  kitStore.set({
    ...initialKitState,
    occasion: q.occasion,
    title: q.title,
    trami: q.trami ?? TRAMI.default,
    guests: q.guests,
    countBy: q.guests ? "guests" : "trami",
    tier: q.tier,
    prefs: q.prefs,
    date: done === 5 ? "undecided" : null,
    step: done,
    furthest: done,
  });
}
