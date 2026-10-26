import type { Paise } from "../types";
import { formatPrice } from "../utils";

/** Kit totals in whole rupees: ₹14,200. */
export function formatKitAmount(paise: Paise): string {
  return formatPrice(Math.round(paise / 100) * 100);
}

/** Unit prices show paise only below ₹10: ₹1.50, ₹0.60, ₹22. */
export function formatUnitPrice(paise: Paise): string {
  return paise < 1000 ? formatPrice(paise, true) : formatKitAmount(paise);
}

/** "50 trami × 4", "1 per 10 trami" — or "1 per guest", "1 per 20 guests" — with "+ 10%" when extra stock is on. */
export function quantityHint(trami: number, perTrami: number, extra: boolean, guests?: number): string {
  const base = guests
    ? perTrami >= 1
      ? "1 per guest"
      : `1 per ${Math.round(4 / perTrami)} guests`
    : perTrami >= 1
      ? `${trami} trami × ${perTrami}`
      : `1 per ${Math.round(1 / perTrami)} trami`;
  return extra ? `${base} + 10%` : base;
}

/** "Sat, 14 Nov 2026" from YYYY-MM-DD (read as a local date, not UTC). */
export function formatEventDate(iso: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    ...(style === "short" && { year: "numeric" }),
  });
}
