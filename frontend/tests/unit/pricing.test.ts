import { describe, expect, it } from "vitest";
import { computeTotals, evaluateCoupon, shippingFor, subtotalOf } from "@/lib/pricing";
import type { Coupon } from "@/lib/types";
import { couponFormSchema } from "@/lib/validations";

const now = new Date("2026-10-09T10:00:00Z");
const shipping = { methodPrice: 15000, freeShippingThreshold: 499900 };

const coupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  code: "TEST",
  type: "percentage",
  value: 10,
  minSubtotal: 0,
  startsAt: "2026-01-01T00:00:00Z",
  expiresAt: "2027-01-01T00:00:00Z",
  usedCount: 0,
  isActive: true,
  ...overrides,
});

describe("subtotal & shipping", () => {
  it("sums integer paise without floating-point drift", () => {
    expect(
      subtotalOf([
        { unitPrice: 19990, quantity: 3 },
        { unitPrice: 10, quantity: 7 },
      ]),
    ).toBe(60040);
  });

  it("charges flat shipping below the threshold and none above it", () => {
    expect(shippingFor(100000, shipping)).toBe(15000);
    expect(shippingFor(499900, shipping)).toBe(0);
  });

  it("never charges shipping on an empty bag", () => {
    expect(shippingFor(0, shipping)).toBe(0);
  });

  it("disables free shipping when no threshold is configured", () => {
    expect(shippingFor(9_999_900, { methodPrice: 15000, freeShippingThreshold: null })).toBe(15000);
  });
});

describe("evaluateCoupon", () => {
  const lines = [{ unitPrice: 200000, quantity: 1 }];

  it("applies a percentage discount, rounding down to whole paise", () => {
    const r = evaluateCoupon(coupon({ value: 15 }), [{ unitPrice: 33333, quantity: 1 }], now);
    expect(r).toMatchObject({ ok: true, discount: 4999 });
  });

  it("caps percentage discounts at maxDiscount", () => {
    const r = evaluateCoupon(coupon({ value: 50, maxDiscount: 30000 }), lines, now);
    expect(r).toMatchObject({ ok: true, discount: 30000 });
  });

  it("treats a cap of 0 as no cap", () => {
    const r = evaluateCoupon(coupon({ value: 10, maxDiscount: 0 }), lines, now);
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.discount).toBeGreaterThan(0);
  });

  it("an empty max-discount field in the admin form means no cap, not 0", () => {
    const form = {
      code: "eid12",
      type: "percentage",
      value: "12",
      minSubtotal: "0",
      startsAt: "2026-10-01",
      expiresAt: "2026-11-01",
      isActive: true,
    };
    expect(couponFormSchema.parse({ ...form, maxDiscount: "", usageLimit: "", perCustomerLimit: "" })).toMatchObject({
      maxDiscount: "",
      usageLimit: "",
    });
    expect(couponFormSchema.parse({ ...form, maxDiscount: "500", usageLimit: "", perCustomerLimit: "" }).maxDiscount).toBe(500);
  });

  it("never discounts more than the eligible subtotal for fixed coupons", () => {
    const r = evaluateCoupon(coupon({ type: "fixed", value: 900000 }), lines, now);
    expect(r).toMatchObject({ ok: true, discount: 200000 });
  });

  it("rejects unknown, inactive, expired and not-yet-active codes", () => {
    expect(evaluateCoupon(undefined, lines, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ isActive: false }), lines, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ expiresAt: "2026-06-30T00:00:00Z" }), lines, now)).toMatchObject({
      ok: false,
      reason: "This code has expired.",
    });
    expect(evaluateCoupon(coupon({ startsAt: "2026-12-01T00:00:00Z" }), lines, now)).toMatchObject({
      ok: false,
      reason: "This code isn't active yet.",
    });
  });

  it("enforces minimum subtotal, usage limits and per-customer limits", () => {
    expect(evaluateCoupon(coupon({ minSubtotal: 500000 }), lines, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ usageLimit: 10, usedCount: 10 }), lines, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ perCustomerLimit: 1 }), lines, now, 1).ok).toBe(false);
  });
});

describe("computeTotals", () => {
  it("applies discount before deciding on free shipping", () => {
    const t = computeTotals([{ unitPrice: 500000, quantity: 1 }], 50000, shipping);
    expect(t).toEqual({ subtotal: 500000, discount: 50000, shipping: 15000, tax: 0, total: 465000 });
  });

  it("clamps negative or oversized discounts", () => {
    expect(computeTotals([{ unitPrice: 1000, quantity: 1 }], -500, shipping).discount).toBe(0);
    expect(computeTotals([{ unitPrice: 1000, quantity: 1 }], 5000, shipping).discount).toBe(1000);
  });
});
