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

/** "50 trami × 4", "1 per 10 trami", with "+ 10%" when extra stock is on. */
export function quantityHint(trami: number, perTrami: number, extra: boolean): string {
  const base = perTrami >= 1 ? `${trami} trami × ${perTrami}` : `1 per ${Math.round(1 / perTrami)} trami`;
  return extra ? `${base} + 10%` : base;
}
