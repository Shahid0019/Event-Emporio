import type { KitLine, KitPrefs } from "./buildKit";
import { activeLines, kitTotal } from "./buildKit";
import { kitItemById, OCCASION_IDS, occasions, readyKits, TIER_IDS, TRAMI, tiers, type Occasion, type ReadyKit, type Tier } from "./config";
import { formatKitAmount } from "./format";

/**
 * The shareable part of a kit lives in the query string:
 *   /kit?occasion=wazwan&trami=50&tier=standard&prefs=bio,extra
 * Variant/quantity edits stay in the browser only.
 */

export interface KitQuery {
  occasion: Occasion | null;
  trami: number | null;
  tier: Tier | null;
  prefs: KitPrefs;
}

const PREF_KEYS = ["bio", "printed", "extra"] as const;

const isOccasion = (v: string | null): v is Occasion => v !== null && (OCCASION_IDS as readonly string[]).includes(v);
const isTier = (v: string | null): v is Tier => v !== null && (TIER_IDS as readonly string[]).includes(v);

export function clampTrami(n: number): number {
  return Math.min(TRAMI.max, Math.max(TRAMI.min, Math.round(n)));
}

export function parseKitQuery(params: URLSearchParams): KitQuery {
  const occasion = params.get("occasion");
  const tier = params.get("tier");
  const tramiRaw = Number(params.get("trami"));
  const prefList = (params.get("prefs") ?? "").split(",");
  return {
    occasion: isOccasion(occasion) ? occasion : null,
    trami: params.has("trami") && Number.isFinite(tramiRaw) && tramiRaw > 0 ? clampTrami(tramiRaw) : null,
    tier: isTier(tier) ? tier : null,
    prefs: { bio: prefList.includes("bio"), printed: prefList.includes("printed"), extra: prefList.includes("extra") },
  };
}

export function kitQueryString(q: KitQuery): string {
  const params = new URLSearchParams();
  if (q.occasion) params.set("occasion", q.occasion);
  if (q.occasion && q.trami !== null) params.set("trami", String(q.trami));
  if (q.occasion && q.tier) params.set("tier", q.tier);
  const prefs = PREF_KEYS.filter((k) => q.prefs[k]);
  if (q.occasion && prefs.length) params.set("prefs", prefs.join(","));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const readyKitById = (id: string | null): ReadyKit | undefined => readyKits.find((r) => r.id === id);

export const occasionName = (id: Occasion) => occasions.find((o) => o.id === id)?.name ?? id;
export const tierName = (id: Tier) => tiers.find((t) => t.id === id)?.name ?? id;

/** Plain-text kit summary for WhatsApp. */
export function shareText(q: KitQuery & { trami: number }, lines: KitLine[], url: string): string {
  const active = activeLines(lines);
  const head = [q.occasion && occasionName(q.occasion), `${q.trami} trami`, q.tier && tierName(q.tier)].filter(Boolean).join(" · ");
  const rows = active.map((l) => {
    const variant = kitItemById(l.itemId)?.variants[l.variantIndex]?.name;
    return `• ${l.name}${variant ? ` (${variant})` : ""} × ${l.qty}`;
  });
  return [
    `Events Emporio kit: ${head}`,
    `${active.length} cheezein, kul ${formatKitAmount(kitTotal(lines))}`,
    "",
    ...rows,
    "",
    `Kit dekhiye: ${url}`,
  ].join("\n");
}
