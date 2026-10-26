"use client";

import { useEffect, useState } from "react";
import { useStoreSettings } from "@/components/providers/store-data";
import { computeTotals, type CouponResult } from "@/lib/pricing";
import type { Quote } from "@/lib/quote";
import type { ShippingMethodId } from "@/lib/settings";
import { shippingPrice } from "@/lib/settings";
import { cartStore, couponStore } from "@/lib/store";
import type { OrderTotals } from "@/lib/types";

/**
 * Totals for the bag, drawer and checkout. Shows an instant estimate, then
 * the server's quote — the same calculation checkout charges — which applies
 * the coupon, current prices, stock and shipping rates.
 */
export function useCartTotals(shippingMethod: ShippingMethodId = "standard") {
  const settings = useStoreSettings();
  const lines = cartStore.useStore();
  const code = couponStore.useStore();
  const key = JSON.stringify([lines.map((l) => [l.productId, l.variantId, l.quantity, Boolean(l.bundle)]), code, shippingMethod]);
  const [result, setResult] = useState<{ key: string; quote: Quote | null; failed: boolean }>({ key: "", quote: null, failed: false });

  useEffect(() => {
    const [items, coupon, method] = JSON.parse(key) as [[string, string, number, boolean][], string | null, ShippingMethodId];
    if (!items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map(([productId, variantId, quantity, inKit]) => ({ productId, variantId, quantity, ...(inKit && { inKit }) })),
          couponCode: coupon ?? undefined,
          shippingMethod: method,
          includeOffers: true,
        }),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<Quote>) : Promise.reject(new Error("quote failed"))))
        .then((quote) => setResult({ key, quote, failed: false }))
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setResult({ key, quote: null, failed: true });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const fresh = result.key === key;
  const quote = fresh ? result.quote : null;
  const estimate: OrderTotals = computeTotals(
    lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
    0,
    { methodPrice: shippingPrice(settings, shippingMethod), freeShippingThreshold: settings.shipping.freeShippingThreshold },
  );
  const coupon: CouponResult | null = quote?.couponError ? { ok: false, reason: quote.couponError } : null;

  return {
    lines,
    code,
    quote,
    /** Server totals once known, otherwise an estimate without any coupon. */
    totals: quote?.totals ?? estimate,
    coupon,
    /** The shop's listed coupons, checked against this bag. */
    offers: quote?.offers ?? [],
    confirmed: Boolean(quote),
    failed: fresh && result.failed,
  };
}
