import { z } from "zod";
import { findCoupon } from "./data/content";
import { products } from "./data/products";
import { storeSettings } from "./data/settings";
import { computeTotals, evaluateCoupon, lineCap } from "./pricing";
import type { OrderTotals } from "./types";
import { variantLabel } from "./utils";

export const quoteRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().max(40),
        variantId: z.string().max(60),
        quantity: z.number().int().min(1).max(100000),
      }),
    )
    .min(1)
    .max(50),
  couponCode: z.string().trim().max(30).optional(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
});

export type QuoteRequest = z.input<typeof quoteRequestSchema>;

export interface QuoteLine {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  available: number;
}

export interface Quote {
  lines: QuoteLine[];
  issues: { variantId: string; message: string }[];
  totals: OrderTotals;
  couponError?: string;
  couponApplied?: string;
}

/**
 * Builds an authoritative quote from trusted catalogue data. Only product
 * and variant IDs and quantities come from the client; every price, stock
 * level, discount and shipping charge is looked up or computed here.
 */
export function buildQuote(input: z.infer<typeof quoteRequestSchema>, now = new Date()): Quote {
  const issues: Quote["issues"] = [];
  const lines: (QuoteLine & { categorySlug: string })[] = [];

  for (const requested of input.lines) {
    const product = products.find((p) => p.id === requested.productId && p.status === "active");
    const variant = product?.variants.find((v) => v.id === requested.variantId);
    if (!product || !variant) {
      issues.push({ variantId: requested.variantId, message: "This item is no longer available and was left out." });
      continue;
    }
    if (variant.stock <= 0) {
      issues.push({ variantId: variant.id, message: `${product.name} is now out of stock.` });
      continue;
    }
    const quantity = Math.min(requested.quantity, lineCap(variant.stock, product.maxPerOrder));
    if (quantity < requested.quantity) {
      const message =
        quantity === variant.stock
          ? `Only ${variant.stock} of ${product.name} available — quantity adjusted.`
          : `Maximum ${quantity} of ${product.name} per order — quantity adjusted.`;
      issues.push({ variantId: variant.id, message });
    }
    lines.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantLabel: variantLabel(variant.options),
      unitPrice: variant.price,
      quantity,
      available: variant.stock,
      categorySlug: product.categorySlug,
    });
  }

  const method = storeSettings.shipping.methods.find((m) => m.id === input.shippingMethod) ?? storeSettings.shipping.methods[0];
  const coupon = input.couponCode ? evaluateCoupon(findCoupon(input.couponCode), lines, now) : null;
  const totals = computeTotals(lines, coupon?.ok ? coupon.discount : 0, {
    methodPrice: method.price,
    freeShippingThreshold: storeSettings.shipping.freeShippingThreshold,
  });

  return {
    lines: lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      name: line.name,
      variantLabel: line.variantLabel,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      available: line.available,
    })),
    issues,
    totals,
    couponApplied: coupon?.ok ? coupon.coupon.code : undefined,
    couponError: coupon && !coupon.ok ? coupon.reason : undefined,
  };
}
