import type { Coupon, OrderTotals, Paise } from "./types";
import { formatPrice } from "./utils";

/** Normal per-line quantity cap; bulk products raise it with `maxPerOrder`. */
export const MAX_LINE_QUANTITY = 20;

/** Highest quantity one cart line may hold: limited by stock and the product's per-order cap. */
export function lineCap(stock: number, maxPerOrder?: number): number {
  return Math.min(stock, maxPerOrder ?? MAX_LINE_QUANTITY);
}

export interface PricingLine {
  unitPrice: Paise;
  quantity: number;
}

export interface ShippingRules {
  methodPrice: Paise;
  freeShippingThreshold: Paise | null;
}

export type CouponResult = { ok: true; coupon: Coupon; discount: Paise } | { ok: false; reason: string };

export function subtotalOf(lines: PricingLine[]): Paise {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

/**
 * Validates a coupon against a cart and returns the discount in paise.
 * The same function must run on the server before an order is created —
 * a discount computed in the browser is only ever a preview.
 */
export function evaluateCoupon(coupon: Coupon | undefined, lines: PricingLine[], now: Date, customerUses = 0): CouponResult {
  if (!coupon || !coupon.isActive) return { ok: false, reason: "This code isn't valid." };
  if (now < new Date(coupon.startsAt)) return { ok: false, reason: "This code isn't active yet." };
  if (now > new Date(coupon.expiresAt)) return { ok: false, reason: "This code has expired." };
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "This code has reached its usage limit." };
  }
  if (coupon.perCustomerLimit !== undefined && customerUses >= coupon.perCustomerLimit) {
    return { ok: false, reason: "You've already used this code." };
  }

  const subtotal = subtotalOf(lines);
  if (subtotal === 0) return { ok: false, reason: "Add something to your bag to use this code." };
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, reason: `Add items worth ${formatPrice(coupon.minSubtotal)} or more to use this code.` };
  }

  let discount = coupon.type === "percentage" ? Math.floor((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);

  // A cap of 0 (or none) means no cap.
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { ok: true, coupon, discount };
}

export function shippingFor(discountedSubtotal: Paise, rules: ShippingRules): Paise {
  if (discountedSubtotal === 0) return 0;
  if (rules.freeShippingThreshold !== null && discountedSubtotal >= rules.freeShippingThreshold) return 0;
  return rules.methodPrice;
}

/** Prices are tax-inclusive, so tax is reported as the GST portion already contained in the total. */
export function computeTotals(lines: PricingLine[], discount: Paise, shipping: ShippingRules): OrderTotals {
  const subtotal = subtotalOf(lines);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const afterDiscount = subtotal - safeDiscount;
  const shippingCost = shippingFor(afterDiscount, shipping);
  return {
    subtotal,
    discount: safeDiscount,
    shipping: shippingCost,
    tax: 0,
    total: afterDiscount + shippingCost,
  };
}
