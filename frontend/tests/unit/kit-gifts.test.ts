import { beforeEach, describe, expect, it } from "vitest";
import { buildKit, kitTotal, NO_PREFS } from "@/lib/kit/buildKit";
import { saveKitToCart } from "@/lib/kit/cart";
import { getKitCatalog, setKitCatalog } from "@/lib/kit/catalog";
import { KIT_MAX_PER_ORDER } from "@/lib/kit/config";
import { giftLines, giftProductsFrom, giftsTotal } from "@/lib/kit/gifts";
import { decodeSharedKit, encodeSharedKit, type SharedKit } from "@/lib/kit/shared";
import { addGift, guestsOf, initialKitState, kitStore, loadCompleteKit, setGuests, setTrami } from "@/lib/kit/store";
import { products } from "@/lib/data/products";
import { buildQuote } from "@/lib/quote";
import { cartStore } from "@/lib/store";

// The giveaway picker offers the everyday products (the starter catalogue has none).
setKitCatalog({ ...getKitCatalog(), gifts: giftProductsFrom(products) });

const redBox = { productId: "p_022", variantId: "ee-cg-red-v1" }; // Festive Red Gift Box, 30 in stock

const kit: SharedKit = {
  occasion: "walima",
  title: "Sana ki Walima",
  trami: 50,
  tier: "standard",
  prefs: NO_PREFS,
  date: null,
  overrides: {},
  gifts: [{ ...redBox, qty: 25 }],
};

describe("counting by guests", () => {
  beforeEach(() => kitStore.set(initialKitState));

  it("rounds guests up into trami (four to a trami) and keeps the exact count", () => {
    setGuests(203);
    expect(kitStore.get().trami).toBe(51);
    expect(guestsOf(kitStore.get())).toBe(203);
  });

  it("changing the trami directly goes back to four guests per trami", () => {
    setGuests(203);
    setTrami(40);
    expect(guestsOf(kitStore.get())).toBe(160);
  });
});

describe("one per guest", () => {
  const base = { occasion: "wazwan", trami: 51, tier: "standard" as const, prefs: NO_PREFS };
  const qty = (lines: ReturnType<typeof buildKit>, id: string) => lines.find((l) => l.itemId === id)?.qty;

  it("counting by guests, per-person items are one each and shared supplies scale", () => {
    const perGuest = buildKit({ ...base, guests: 203 });
    expect(qty(perGuest, "dastarkhan")).toBe(203); // 1 per trami → 1 per guest
    expect(qty(perGuest, "spoon")).toBe(203); // 4 per trami → still 1 per guest
    expect(qty(perGuest, "trash")).toBe(11); // 1 per 5 trami → 1 per 20 guests
    // Counting by trami is unchanged.
    expect(qty(buildKit(base), "dastarkhan")).toBe(51);
  });

  it("the guest count travels in the kit link", () => {
    const decoded = decodeSharedKit(encodeSharedKit({ ...base, guests: 203, date: null, overrides: {} }))!;
    expect(decoded.guests).toBe(203);
    expect(qty(buildKit(decoded), "dastarkhan")).toBe(203);
  });
});

describe("giveaways", () => {
  beforeEach(() => cartStore.set([]));

  it("only offers everyday products with a fixed price (no kit products)", () => {
    const offered = getKitCatalog().gifts;
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.some((p) => p.id === redBox.productId)).toBe(true);
    expect(products.filter((p) => p.kit).every((k) => !offered.some((p) => p.id === k.id))).toBe(true);
  });

  it("travel in the kit link and are priced from the catalogue", () => {
    const decoded = decodeSharedKit(encodeSharedKit(kit))!;
    expect(decoded.gifts).toEqual(kit.gifts);
    const [line] = giftLines(decoded.gifts);
    expect(line.product.name).toBe("Festive Red Gift Box");
    expect(giftsTotal([line])).toBe(59900 * 25);
  });

  it("go in the bag as lines of the same kit, beyond the usual 20 per line", () => {
    const id = saveKitToCart(kit, buildKit(kit));
    const lines = cartStore.get().filter((l) => l.bundle?.id === id);
    const gift = lines.find((l) => l.variantId === redBox.variantId)!;
    expect(gift.quantity).toBe(25);
    expect(gift.maxPerOrder).toBe(KIT_MAX_PER_ORDER);
    expect(gift.bundle?.summary).toMatch(/1 giveaway/);
    expect(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)).toBe(kitTotal(buildKit(kit)) + 59900 * 25);
  });

  it("reopen with the kit, and the same product and option can't be added twice", () => {
    loadCompleteKit(kit);
    expect(kitStore.get().gifts).toEqual(kit.gifts);
    expect(addGift(redBox.productId, redBox.variantId, 10)).toBe("exists");
  });

  it("checkout lets kit lines go past 20 (up to stock), but not single products", async () => {
    const inKit = await buildQuote({ lines: [{ ...redBox, quantity: 25, inKit: true }], shippingMethod: "standard" });
    expect(inKit.lines[0].quantity).toBe(25);
    const tooMany = await buildQuote({ lines: [{ ...redBox, quantity: 40, inKit: true }], shippingMethod: "standard" });
    expect(tooMany.lines[0].quantity).toBe(30); // all the stock there is
    const single = await buildQuote({ lines: [{ ...redBox, quantity: 25 }], shippingMethod: "standard" });
    expect(single.lines[0].quantity).toBe(20);
  });
});
