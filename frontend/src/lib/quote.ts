import { z } from "zod";
import { getDb, plain, plainAll } from "./db/client";
import { loadSettings } from "./db/queries";
import { computeTotals, evaluateCoupon, lineCap } from "./pricing";
import { shippingPrice, type ShippingMethodId } from "./settings";
import type { Coupon, OrderTotals, Product } from "./types";
import { KIT_MAX_PER_ORDER } from "./kit/config";
import { formatPrice, variantLabel } from "./utils";

export const quoteRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().max(40),
        variantId: z.string().max(60),
        quantity: z.number().int().min(1).max(100000),
        /** Part of a kit: bought in bulk, so only stock limits it (giveaways for every guest). */
        inKit: z.boolean().optional(),
      }),
    )
    .min(1)
    // Kits add one line per item (up to ~20 each), so allow a few kits plus single products.
    .max(200),
  couponCode: z.string().trim().max(30).optional(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  /** Also list the shop's coupons, each checked against this bag (for the coupon picker). */
  includeOffers: z.boolean().optional(),
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
  categorySlug: string;
  /** Position of this line in the request (lines that can't be sold are skipped). */
  index: number;
}

/** A coupon as the bag lists it, already checked against the shopper's items. */
export interface CouponOffer {
  code: string;
  /** "10% off" or "₹200 off" */
  headline: string;
  /** "On orders over ₹999 · Up to ₹500 off · Ends 31 Dec" */
  details: string;
  applies: boolean;
  /** What it takes off this bag, when it applies. */
  saving?: number;
  /** Why it doesn't apply yet, e.g. "Add items worth ₹999 or more to use this code." */
  reason?: string;
}

export interface Quote {
  lines: QuoteLine[];
  issues: { variantId: string; message: string }[];
  totals: OrderTotals;
  couponError?: string;
  couponApplied?: string;
  /** Only when asked for with `includeOffers`. Codes that apply come first, biggest saving first. */
  offers?: CouponOffer[];
}

export async function findCouponByCode(code: string): Promise<Coupon | undefined> {
  const db = await getDb();
  return plain<Coupon>(await db.collection("coupons").findOne({ code: code.trim().toUpperCase() })) ?? undefined;
}

/**
 * Builds an authoritative quote from the database. Only product and variant
 * ids and quantities come from the browser; every price, stock level,
 * discount and shipping charge is looked up or computed here. Reads
 * products fresh (not cached) so stock is current.
 */
export async function buildQuote(input: z.infer<typeof quoteRequestSchema>, now = new Date()): Promise<Quote> {
  const db = await getDb();
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const [products, settings] = await Promise.all([
    db
      .collection("products")
      .find({ _id: { $in: ids as never[] }, status: "active" })
      .toArray()
      .then((docs) => plainAll<Product>(docs)),
    loadSettings(),
  ]);

  const issues: Quote["issues"] = [];
  const lines: QuoteLine[] = [];
  for (const [index, requested] of input.lines.entries()) {
    const product = products.find((p) => p.id === requested.productId);
    const variant = product?.variants.find((v) => v.id === requested.variantId);
    if (!product || !variant) {
      issues.push({ variantId: requested.variantId, message: "This item is no longer available and was left out." });
      continue;
    }
    if (variant.stock <= 0) {
      issues.push({ variantId: variant.id, message: `${product.name} is now out of stock.` });
      continue;
    }
    const cap = requested.inKit
      ? Math.min(variant.stock, Math.max(product.maxPerOrder ?? 0, KIT_MAX_PER_ORDER))
      : lineCap(variant.stock, product.maxPerOrder);
    const quantity = Math.min(requested.quantity, cap);
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
      index,
    });
  }

  const coupon = input.couponCode ? evaluateCoupon(await findCouponByCode(input.couponCode), lines, now) : null;
  const totals = computeTotals(lines, coupon?.ok ? coupon.discount : 0, {
    methodPrice: shippingPrice(settings, input.shippingMethod as ShippingMethodId),
    freeShippingThreshold: settings.shipping.freeShippingThreshold,
  });

  return {
    lines,
    issues,
    totals,
    couponApplied: coupon?.ok ? coupon.coupon.code : undefined,
    couponError: coupon && !coupon.ok ? coupon.reason : undefined,
    ...(input.includeOffers && { offers: await listOffers(lines, now) }),
  };
}

/**
 * The shop's public coupons that can be used now, each checked against the
 * bag with the same rules checkout uses. Private codes, used-up or
 * out-of-date ones aren't listed.
 */
async function listOffers(lines: QuoteLine[], now: Date): Promise<CouponOffer[]> {
  const db = await getDb();
  const coupons = plainAll<Coupon>(
    await db
      .collection("coupons")
      .find({ isActive: true, showInBag: { $ne: false } })
      .toArray(),
  );
  const ends = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  return coupons
    .filter(
      (c) => now >= new Date(c.startsAt) && now <= new Date(c.expiresAt) && (c.usageLimit === undefined || c.usedCount < c.usageLimit),
    )
    .map((c): CouponOffer => {
      const result = evaluateCoupon(c, lines, now);
      const details = [
        c.minSubtotal > 0 && `On orders over ${formatPrice(c.minSubtotal)}`,
        c.type === "percentage" && c.maxDiscount && `Up to ${formatPrice(c.maxDiscount)} off`,
        `Ends ${ends(c.expiresAt)}`,
      ].filter(Boolean);
      return {
        code: c.code,
        headline: c.type === "percentage" ? `${c.value}% off` : `${formatPrice(c.value)} off`,
        details: details.join(" · "),
        applies: result.ok,
        ...(result.ok ? { saving: result.discount } : { reason: result.reason }),
      };
    })
    .sort((a, b) => Number(b.applies) - Number(a.applies) || (b.saving ?? 0) - (a.saving ?? 0) || a.code.localeCompare(b.code));
}
