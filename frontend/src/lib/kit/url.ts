import type { KitLine, KitPrefs } from "./buildKit";
import { activeLines, kitTotal } from "./buildKit";
import { kitFunctionById, kitItemById } from "./catalog";
import { CUSTOM_FUNCTION, FUNCTION_TITLE_MAX, TIER_IDS, TRAMI, tiers, type Occasion, type Tier } from "./config";
import { formatKitAmount } from "./format";
import { giftsTotal, type GiftLine } from "./gifts";

/**
 * The shareable part of a kit lives in the query string:
 *   /kit?occasion=wazwan&name=Sana+ki+Wazwan&trami=50&tier=standard&prefs=bio,extra
 *   /kit?occasion=walima&guests=203&tier=standard   (counted per guest)
 * Variant/quantity edits stay in the browser only.
 */

export interface KitQuery {
  occasion: Occasion | null;
  /** The shopper's own name for the function ("Sana ki Mehndi"). */
  title?: string;
  trami: number | null;
  /** Counted per guest instead of per trami. */
  guests?: number;
  tier: Tier | null;
  prefs: KitPrefs;
}

const PREF_KEYS = ["bio", "printed", "extra"] as const;

/** A function the shop offers, or the shopper's own. */
const isOccasion = (v: string | null): v is Occasion => v === CUSTOM_FUNCTION || Boolean(kitFunctionById(v));

/** Trims and caps a function name typed by a shopper or the shop; empty becomes undefined. */
export function cleanTitle(value: string | null | undefined): string | undefined {
  const v = value?.replace(/\s+/g, " ").trim().slice(0, FUNCTION_TITLE_MAX);
  return v || undefined;
}
const isTier = (v: string | null): v is Tier => v !== null && (TIER_IDS as readonly string[]).includes(v);

export function clampTrami(n: number): number {
  return Math.min(TRAMI.max, Math.max(TRAMI.min, Math.round(n)));
}

export function parseKitQuery(params: URLSearchParams): KitQuery {
  const occasion = params.get("occasion");
  const tier = params.get("tier");
  const tramiRaw = Number(params.get("trami"));
  const guestsRaw = Math.round(Number(params.get("guests")));
  const guests = params.has("guests") && guestsRaw >= 1 ? Math.min(guestsRaw, TRAMI.max * 4) : undefined;
  const prefList = (params.get("prefs") ?? "").split(",");
  const valid = isOccasion(occasion) ? occasion : null;
  return {
    occasion: valid,
    ...(valid && cleanTitle(params.get("name")) && { title: cleanTitle(params.get("name")) }),
    trami: guests
      ? clampTrami(Math.ceil(guests / 4))
      : params.has("trami") && Number.isFinite(tramiRaw) && tramiRaw > 0
        ? clampTrami(tramiRaw)
        : null,
    ...(guests && { guests }),
    tier: isTier(tier) ? tier : null,
    prefs: { bio: prefList.includes("bio"), printed: prefList.includes("printed"), extra: prefList.includes("extra") },
  };
}

export function kitQueryString(q: KitQuery): string {
  const params = new URLSearchParams();
  if (q.occasion) params.set("occasion", q.occasion);
  const title = cleanTitle(q.title);
  if (q.occasion && title) params.set("name", title);
  if (q.occasion && q.guests) params.set("guests", String(q.guests));
  else if (q.occasion && q.trami !== null) params.set("trami", String(q.trami));
  if (q.occasion && q.tier) params.set("tier", q.tier);
  const prefs = PREF_KEYS.filter((k) => q.prefs[k]);
  if (q.occasion && prefs.length) params.set("prefs", prefs.join(","));
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** The shop's name for a function; a shopper's own function without a name is "Your own function". */
export function occasionName(id: Occasion): string {
  if (id === CUSTOM_FUNCTION) return "Your own function";
  return kitFunctionById(id)?.name ?? id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** What a kit is called: the shopper's own name when they gave one, else the function's. */
export const kitTitle = (k: { occasion: Occasion; title?: string }) => cleanTitle(k.title) ?? occasionName(k.occasion);
export const tierName = (id: Tier) => tiers.find((t) => t.id === id)?.name ?? id;

/** Plain-text kit summary for WhatsApp. */
/** "203 guests" when counted per guest, else "50 trami". */
export const sizeLabel = (k: { trami: number; guests?: number }) => (k.guests ? `${k.guests} guests` : `${k.trami} trami`);

export function shareText(q: KitQuery & { trami: number }, lines: KitLine[], url: string, gifts: GiftLine[] = []): string {
  const active = activeLines(lines);
  const head = [q.occasion && kitTitle({ occasion: q.occasion, title: q.title }), sizeLabel(q), q.tier && tierName(q.tier)]
    .filter(Boolean)
    .join(" · ");
  const rows = active.map((l) => {
    const variant = kitItemById(l.itemId)?.variants[l.variantIndex]?.name;
    return `• ${l.name}${variant ? ` (${variant})` : ""} × ${l.qty}`;
  });
  return [
    `Events Emporio kit: ${head}`,
    `${active.length + gifts.length} items, ${formatKitAmount(kitTotal(lines) + giftsTotal(gifts))} in total`,
    "",
    ...rows,
    ...(gifts.length
      ? ["", "Giveaways:", ...gifts.map((g) => `• ${g.product.name}${g.variant.label ? ` (${g.variant.label})` : ""} × ${g.gift.qty}`)]
      : []),
    "",
    `See the kit: ${url}`,
  ].join("\n");
}
