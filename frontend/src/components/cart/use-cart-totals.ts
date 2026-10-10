"use client";

import { findCoupon } from "@/lib/data/content";
import { storeSettings } from "@/lib/data/settings";
import { computeTotals, evaluateCoupon, type CouponResult } from "@/lib/pricing";
import { cartStore, couponStore } from "@/lib/store";

/**
 * Display-only totals for the bag and checkout. The server repeats this
 * calculation from trusted product data before any payment is created.
 */
export function useCartTotals(shippingPrice: number = storeSettings.shipping.flatRate) {
  const lines = cartStore.useStore();
  const code = couponStore.useStore();

  const pricingLines = lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, categorySlug: l.categorySlug }));
  const coupon: CouponResult | null = code ? evaluateCoupon(findCoupon(code), pricingLines, new Date()) : null;
  const totals = computeTotals(pricingLines, coupon?.ok ? coupon.discount : 0, {
    methodPrice: shippingPrice,
    freeShippingThreshold: storeSettings.shipping.freeShippingThreshold,
  });

  return { lines, code, coupon, totals };
}
