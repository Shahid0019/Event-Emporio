import { z } from "zod";
import { KIT_ADDITIONS_MAX, type KitAddition, type KitOverrides, type KitPrefs } from "./buildKit";
import {
  DATE_IDS,
  FUNCTION_ID_MAX,
  FUNCTION_ID_PATTERN,
  FUNCTION_TITLE_MAX,
  TIER_IDS,
  TRAMI,
  KIT_MAX_PER_ORDER,
  type FunctionDate,
  type Occasion,
  type Tier,
} from "./config";
import { kitItemById } from "./catalog";
import { KIT_GIFTS_MAX, type KitGift } from "./gifts";
import { cleanTitle } from "./url";

/**
 * A kit prepared by the shop for one customer, carried entirely in the link
 * (`/kit?k=…`) so it opens on the customer's own phone without a backend.
 * The link is untrusted input: every field is validated and clamped on the
 * way in, and prices are never part of it — they always come from the
 * catalogue, and checkout re-prices on the server as usual.
 */
export interface SharedKit {
  /** A function id from Admin → Functions, or CUSTOM_FUNCTION. Unknown ids still work: they get the everyday items. */
  occasion: Occasion;
  /** The shopper's own name for the function: "Sana ki Mehndi". */
  title?: string;
  trami: number;
  /** Set when counted by guests (one per person); trami is then the guests rounded up into trami. */
  guests?: number;
  tier: Tier;
  prefs: KitPrefs;
  date: FunctionDate | null;
  overrides: KitOverrides;
  /** Lines the shopper added on top of the suggested kit. */
  added?: KitAddition[];
  /** Shop products added as giveaways for the guests. */
  gifts?: KitGift[];
  /** Shown in the chat: "Ayesha, we've put this kit together especially for you." */
  customerName?: string;
  /** A short message from the shop. */
  note?: string;
}

export const SHARED_NAME_MAX = 60;
export const SHARED_NOTE_MAX = 240;

/* Compact wire format keeps WhatsApp links short. */
const wireSchema = z.object({
  v: z.literal(1),
  o: z.string().max(FUNCTION_ID_MAX).regex(FUNCTION_ID_PATTERN),
  f: z.string().max(FUNCTION_TITLE_MAX).optional(),
  t: z.number().int().min(TRAMI.min).max(TRAMI.max),
  /** Guests, when counted per person. */
  u: z
    .number()
    .int()
    .min(1)
    .max(TRAMI.max * 4)
    .optional(),
  r: z.enum(TIER_IDS),
  p: z
    .string()
    .regex(/^[bpx]{0,3}$/)
    .optional(),
  d: z.enum(DATE_IDS).optional(),
  /** itemId → [variantIndex | -1, qty | -1, removed 0/1] */
  i: z.record(z.string().max(20), z.tuple([z.number().int(), z.number().int(), z.union([z.literal(0), z.literal(1)])])).optional(),
  /** Added lines: [itemId, variantIndex, qty] */
  a: z
    .array(z.tuple([z.string().max(20), z.number().int(), z.number().int()]))
    .max(KIT_ADDITIONS_MAX)
    .optional(),
  /** Giveaways: [productId, variantId, qty] */
  g: z
    .array(z.tuple([z.string().min(1).max(40), z.string().min(1).max(60), z.number().int()]))
    .max(KIT_GIFTS_MAX)
    .optional(),
  n: z.string().max(SHARED_NAME_MAX).optional(),
  m: z.string().max(SHARED_NOTE_MAX).optional(),
});

type Wire = z.infer<typeof wireSchema>;

function toBase64Url(text: string): string {
  let binary = "";
  new TextEncoder().encode(text).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

const clean = (s: string | undefined, max: number) => {
  const v = s?.replace(/\s+/g, " ").trim().slice(0, max);
  return v ? v : undefined;
};

export function encodeSharedKit(kit: SharedKit): string {
  const items: NonNullable<Wire["i"]> = {};
  for (const [id, o] of Object.entries(kit.overrides)) {
    if (o.variantIndex === undefined && o.qty === undefined && !o.removed) continue;
    items[id] = [o.variantIndex ?? -1, o.qty ?? -1, o.removed ? 1 : 0];
  }
  const prefs = `${kit.prefs.bio ? "b" : ""}${kit.prefs.printed ? "p" : ""}${kit.prefs.extra ? "x" : ""}`;
  const wire: Wire = {
    v: 1,
    o: kit.occasion,
    ...(cleanTitle(kit.title) && { f: cleanTitle(kit.title) }),
    t: kit.trami,
    ...(kit.guests && { u: kit.guests }),
    r: kit.tier,
    ...(prefs && { p: prefs }),
    ...(kit.date && { d: kit.date }),
    ...(Object.keys(items).length && { i: items }),
    ...(kit.added?.length && { a: kit.added.map((x): [string, number, number] => [x.itemId, x.variantIndex, x.qty]) }),
    ...(kit.gifts?.length && { g: kit.gifts.map((x): [string, string, number] => [x.productId, x.variantId, x.qty]) }),
    ...(clean(kit.customerName, SHARED_NAME_MAX) && { n: clean(kit.customerName, SHARED_NAME_MAX) }),
    ...(clean(kit.note, SHARED_NOTE_MAX) && { m: clean(kit.note, SHARED_NOTE_MAX) }),
  };
  return toBase64Url(JSON.stringify(wire));
}

/** Returns the kit, or null for anything malformed. Unknown items and out-of-range values are dropped. */
export function decodeSharedKit(value: string | null | undefined): SharedKit | null {
  if (!value || value.length > 4000) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(value));
  } catch {
    return null;
  }
  const result = wireSchema.safeParse(parsed);
  if (!result.success) return null;
  const w = result.data;

  const overrides: KitOverrides = {};
  for (const [id, [variantIndex, qty, removed]] of Object.entries(w.i ?? {})) {
    const item = kitItemById(id);
    if (!item) continue;
    const o: KitOverrides[string] = {};
    if (variantIndex >= 0 && variantIndex < item.variants.length) o.variantIndex = variantIndex;
    if (qty >= 1) o.qty = Math.min(qty, KIT_MAX_PER_ORDER);
    if (removed) o.removed = true;
    if (Object.keys(o).length) overrides[id] = o;
  }

  // Ids are positional, so the same kit always encodes the same way.
  const added: KitAddition[] = [];
  for (const [itemId, variantIndex, qty] of w.a ?? []) {
    const item = kitItemById(itemId);
    if (!item || qty < 1) continue;
    added.push({
      id: `a${added.length + 1}`,
      itemId,
      variantIndex: variantIndex >= 0 && variantIndex < item.variants.length ? variantIndex : 0,
      qty: Math.min(qty, KIT_MAX_PER_ORDER),
    });
  }

  // Prices never come from the link; products the shop stopped selling simply don't show.
  const gifts: KitGift[] = (w.g ?? [])
    .filter(([, , qty]) => qty >= 1)
    .map(([productId, variantId, qty]) => ({ productId, variantId, qty: Math.min(qty, KIT_MAX_PER_ORDER) }));

  return {
    occasion: w.o,
    ...(cleanTitle(w.f) && { title: cleanTitle(w.f) }),
    trami: w.t,
    ...(w.u && { guests: w.u }),
    tier: w.r,
    prefs: { bio: !!w.p?.includes("b"), printed: !!w.p?.includes("p"), extra: !!w.p?.includes("x") },
    date: w.d ?? null,
    overrides,
    ...(added.length && { added }),
    ...(gifts.length && { gifts }),
    customerName: clean(w.n, SHARED_NAME_MAX),
    note: clean(w.m, SHARED_NOTE_MAX),
  };
}

/** Relative link a customer opens to get this kit. */
export const sharedKitPath = (kit: SharedKit) => `/kit?k=${encodeSharedKit(kit)}`;
