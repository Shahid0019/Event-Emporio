import { describe, expect, it } from "vitest";
import { listProducts, parseListParams, searchSuggestions } from "@/lib/catalog";
import { canTransition, nextStatuses } from "@/lib/order-status";
import { getDb } from "@/lib/db/client";
import { buildQuote } from "@/lib/quote";
import { checkoutSchema, customOrderSchema } from "@/lib/validations";

describe("order status transitions", () => {
  it("follows the fulfilment path", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("rejects skipping steps or moving backwards", () => {
    expect(canTransition("pending", "shipped")).toBe(false);
    expect(canTransition("delivered", "processing")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(nextStatuses("refunded")).toEqual([]);
  });

  it("only refunds orders that were paid", () => {
    expect(canTransition("cancelled", "refunded", "paid")).toBe(true);
    expect(canTransition("cancelled", "refunded", "failed")).toBe(false);
  });
});

describe("catalogue queries", () => {
  it("sanitises untrusted URL params", () => {
    const p = parseListParams({ page: "-4", sort: "drop table", min: "abc", colour: "Blush,Gold" });
    expect(p).toMatchObject({ page: 1, sort: "featured", min: undefined, colour: ["Blush", "Gold"] });
  });

  it("filters by category, stock and price on the server and paginates", async () => {
    const r = await listProducts(parseListParams({ category: "mehndi-baskets", stock: "in" }));
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.categorySlug === "mehndi-baskets" && i.inStock)).toBe(true);

    const priced = await listProducts(parseListParams({ max: "1000" }));
    expect(priced.items.every((i) => i.price <= 100000)).toBe(true);

    const paged = await listProducts(parseListParams({}), 5);
    expect(paged.items).toHaveLength(5);
    expect(paged.pageCount).toBe(Math.ceil(paged.total / 5));
  });

  it("sorts by price", async () => {
    const r = await listProducts(parseListParams({ sort: "price-asc" }));
    const prices = r.items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("never exposes draft products", async () => {
    const r = await listProducts(parseListParams({ q: "centrepiece vase" }));
    expect(r.items.find((i) => i.slug === "floral-centrepiece-vase")).toBeUndefined();
  });

  it("returns typeahead suggestions only for 2+ characters", async () => {
    expect((await searchSuggestions("b")).products).toHaveLength(0);
    expect((await searchSuggestions("brass")).products.length).toBeGreaterThan(0);
  });
});

describe("server quote", () => {
  it("prices from catalogue data, ignoring anything but ids and quantities", async () => {
    const q = await buildQuote({ lines: [{ productId: "p_001", variantId: "ee-mb-rose-v2", quantity: 2 }], shippingMethod: "standard" });
    expect(q.lines[0].unitPrice).toBe(219900);
    expect(q.totals.subtotal).toBe(439800);
    expect(q.issues).toHaveLength(0);
  });

  it("drops out-of-stock items and clamps quantities to available stock", async () => {
    const q = await buildQuote({
      lines: [
        { productId: "p_001", variantId: "ee-mb-rose-v3", quantity: 1 }, // stock 0
        { productId: "p_011", variantId: "ee-lh-mac-v2", quantity: 5 }, // stock 2
      ],
      shippingMethod: "standard",
    });
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].quantity).toBe(2);
    expect(q.issues).toHaveLength(2);
  });

  it("validates coupons server-side", async () => {
    await (await getDb()).collection("coupons").updateOne(
      { code: "WELCOME10" },
      {
        $set: {
          code: "WELCOME10",
          type: "percentage",
          value: 10,
          minSubtotal: 0,
          startsAt: "2026-01-01T00:00:00Z",
          expiresAt: "2027-01-01T00:00:00Z",
          usedCount: 0,
          isActive: true,
        },
      },
      { upsert: true },
    );
    const q = await buildQuote(
      { lines: [{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }], couponCode: "welcome10", shippingMethod: "standard" },
      new Date("2026-10-09T00:00:00Z"),
    );
    expect(q.couponApplied).toBe("WELCOME10");
    expect(q.totals.discount).toBe(32990);
  });

  it("lists the shop's offers for the bag: ones that apply first, private codes hidden", async () => {
    const coupons = (await getDb()).collection("coupons");
    const base = { type: "fixed", startsAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z", usedCount: 0, isActive: true };
    await coupons.updateOne(
      { code: "BIG5000" },
      { $set: { ...base, code: "BIG5000", value: 50000, minSubtotal: 50000000 } },
      { upsert: true },
    );
    await coupons.updateOne({ code: "FLAT100" }, { $set: { ...base, code: "FLAT100", value: 10000, minSubtotal: 0 } }, { upsert: true });
    await coupons.updateOne(
      { code: "SECRET" },
      { $set: { ...base, code: "SECRET", value: 10000, minSubtotal: 0, showInBag: false } },
      { upsert: true },
    );
    const lines = [{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }];
    const q = await buildQuote({ lines, shippingMethod: "standard", includeOffers: true }, new Date("2026-10-09T00:00:00Z"));
    const codes = q.offers!.map((o) => o.code);
    expect(codes).not.toContain("SECRET");
    expect(codes.indexOf("FLAT100")).toBeLessThan(codes.indexOf("BIG5000"));
    expect(q.offers!.find((o) => o.code === "FLAT100")).toMatchObject({ applies: true, saving: 10000, headline: "₹100 off" });
    expect(q.offers!.find((o) => o.code === "BIG5000")).toMatchObject({ applies: false });
    expect(q.offers!.find((o) => o.code === "BIG5000")?.reason).toMatch(/Add items worth/);

    // Checkout's own quote doesn't spend time on the list.
    expect((await buildQuote({ lines, shippingMethod: "standard" })).offers).toBeUndefined();
  });
});

describe("form validation", () => {
  const valid = {
    email: "Guest@Example.com",
    phone: "98765 43210",
    shipping: {
      fullName: "Asha Bhat",
      line1: "12 Residency Road",
      city: "Srinagar",
      state: "Jammu and Kashmir",
      pincode: "190001",
      country: "India",
    },
    shippingMethod: "standard",
  };

  it("normalises email and phone", () => {
    const r = checkoutSchema.parse(valid);
    expect(r.email).toBe("guest@example.com");
    expect(r.phone).toBe("9876543210");
  });

  it("rejects invalid PIN codes and phone numbers", () => {
    expect(checkoutSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, shipping: { ...valid.shipping, pincode: "012345" } }).success).toBe(false);
  });

  it("coerces custom-order quantities", () => {
    const r = customOrderSchema.parse({
      name: "Asha Bhat",
      email: "a@b.co",
      phone: "9876543210",
      occasion: "wedding",
      quantity: "120",
      budget: "unsure",
      details: "Hampers for both families, ivory and gold.",
    });
    expect(r.quantity).toBe(120);
  });
});
