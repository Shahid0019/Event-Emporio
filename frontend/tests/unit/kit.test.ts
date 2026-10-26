import { describe, expect, it } from "vitest";
import {
  activeLines,
  baseQuantity,
  budgetFor,
  buildKit,
  kitTotal,
  NO_PREFS,
  perTramiCost,
  swapSuggestions,
  type KitInput,
} from "@/lib/kit/buildKit";
import { kitItems } from "@/lib/kit/config";
import { kitProducts } from "@/lib/kit/products";
import { buildQuote } from "@/lib/quote";

const input = (overrides: Partial<KitInput> = {}): KitInput => ({
  occasion: "wazwan",
  trami: 50,
  tier: "standard",
  prefs: NO_PREFS,
  ...overrides,
});

const line = (lines: ReturnType<typeof buildKit>, id: string) => {
  const found = lines.find((l) => l.itemId === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

describe("quantities", () => {
  it("counts every item per trami", () => {
    const kit = buildKit(input({ trami: 50 }));
    expect(line(kit, "dastarkhan").qty).toBe(50);
    expect(line(kit, "spoon").qty).toBe(200);
    expect(line(kit, "inner").qty).toBe(100);
    expect(line(kit, "foil").qty).toBe(5);
    expect(line(kit, "tissue").qty).toBe(25);
    expect(line(kit, "trash").qty).toBe(10);
  });

  it("rounds fractional needs up and never goes below one", () => {
    expect(baseQuantity(3, 0.1, false)).toBe(1);
    expect(baseQuantity(1, 0.2, false)).toBe(1);
    expect(baseQuantity(25, 0.5, false)).toBe(13);
  });

  it("adds 10% with the extra-stock preference without float drift", () => {
    const kit = buildKit(input({ trami: 50, prefs: { ...NO_PREFS, extra: true } }));
    expect(line(kit, "dastarkhan").qty).toBe(55);
    expect(line(kit, "spoon").qty).toBe(220);
    expect(line(kit, "foil").qty).toBe(6); // 5.5 → 6
    expect(baseQuantity(10, 1, true)).toBe(11); // 10 × 1.1 is 11.000000000000002 in floats
  });

  it("totals the lines and reports per-trami cost", () => {
    const kit = buildKit(input());
    expect(kitTotal(kit)).toBe(kit.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    // One trami of the standard wazwan kit, computed by hand from the config.
    const expected = kitItems
      .filter((i) => !i.occasions)
      .reduce((s, i) => s + i.perTrami * i.variants[Math.min(1, i.variants.length - 1)].price, 0);
    expect(perTramiCost("wazwan", "standard", NO_PREFS)).toBe(Math.round(expected));
  });
});

describe("tier defaults", () => {
  it("basic picks the first variant", () => {
    expect(buildKit(input({ tier: "basic" })).every((l) => l.variantIndex === 0)).toBe(true);
  });

  it("standard picks the second variant, or the last when there is only one", () => {
    const kit = buildKit(input({ tier: "standard" }));
    expect(kit.every((l) => l.variantIndex === 1)).toBe(true);
    const single = [{ ...kitItems[0], id: "solo", variants: [kitItems[0].variants[0]] }];
    expect(buildKit(input({ tier: "standard" }), single)[0].variantIndex).toBe(0);
  });

  it("premium picks the last variant", () => {
    const kit = buildKit(input({ tier: "premium" }));
    for (const l of kit) {
      expect(l.variantIndex).toBe(kitItems.find((i) => i.id === l.itemId)!.variants.length - 1);
    }
  });

  it("tiers get more expensive and budgets round up to ₹500", () => {
    const answers = { occasion: "wazwan" as const, trami: 50, prefs: NO_PREFS };
    const basic = kitTotal(buildKit({ ...answers, tier: "basic" }));
    const premium = kitTotal(buildKit({ ...answers, tier: "premium" }));
    expect(premium).toBeGreaterThan(basic);
    const budget = budgetFor("basic", answers);
    expect(budget % 50000).toBe(0);
    expect(budget).toBeGreaterThanOrEqual(basic);
    expect(budget - basic).toBeLessThan(50000);
  });
});

describe("preferences", () => {
  it("bio switches salad plate, gostab bowl and cake plate to Bio", () => {
    const kit = buildKit(input({ occasion: "walima", tier: "premium", prefs: { ...NO_PREFS, bio: true } }));
    expect(line(kit, "salad").variantIndex).toBe(1);
    expect(line(kit, "gostab").variantIndex).toBe(1);
    expect(line(kit, "cakeplate").variantIndex).toBe(1);
    // Items without a Bio variant keep their tier default.
    expect(line(kit, "spoon").variantIndex).toBe(3);
  });

  it("printed switches to Printed or Customized variants", () => {
    const kit = buildKit(input({ tier: "basic", prefs: { ...NO_PREFS, printed: true } }));
    expect(line(kit, "napkin").variantIndex).toBe(2); // Printed
    expect(line(kit, "passpass").variantIndex).toBe(3); // Customized
    expect(line(kit, "dastarkhan").variantIndex).toBe(0);
  });
});

describe("overrides", () => {
  it("variant, quantity and removal always win over defaults", () => {
    const kit = buildKit(
      input({
        tier: "premium",
        prefs: { ...NO_PREFS, bio: true },
        overrides: { salad: { variantIndex: 4 }, spoon: { qty: 260 }, knife: { removed: true } },
      }),
    );
    expect(line(kit, "salad").variantIndex).toBe(4);
    expect(line(kit, "salad").defaultVariantIndex).toBe(1);
    expect(line(kit, "spoon").qty).toBe(260);
    expect(line(kit, "spoon").baseQty).toBe(200);
    expect(line(kit, "knife").removed).toBe(true);
    expect(line(kit, "knife").lineTotal).toBe(0);
    expect(activeLines(kit).some((l) => l.itemId === "knife")).toBe(false);
  });

  it("ignores an out-of-range variant override", () => {
    const kit = buildKit(input({ overrides: { knife: { variantIndex: 9 } } }));
    expect(line(kit, "knife").variantIndex).toBe(1);
  });

  it("suggests the swaps that save the most and they lower the total", () => {
    const kit = buildKit(input({ tier: "premium" }));
    const [first, second] = swapSuggestions(kit);
    expect(first.saving).toBeGreaterThanOrEqual(second.saving);
    const swapped = buildKit(input({ tier: "premium", overrides: { [first.itemId]: { variantIndex: first.toIndex } } }));
    expect(kitTotal(kit) - kitTotal(swapped)).toBe(first.saving);
    expect(swapSuggestions(buildKit(input({ tier: "basic" })))).toHaveLength(0);
  });
});

describe("occasion filtering", () => {
  const ids = (occasion: KitInput["occasion"]) => buildKit(input({ occasion })).map((l) => l.itemId);

  it("wazwan has the 16 base items only", () => {
    expect(ids("wazwan")).toHaveLength(16);
    expect(ids("wazwan")).not.toContain("potli");
  });

  it("nikkah adds potli, mehndi adds cones and cake items, walima adds cake items", () => {
    expect(ids("nikkah")).toContain("potli");
    expect(ids("nikkah")).not.toContain("cakeplate");
    expect(ids("mehndi")).toEqual(expect.arrayContaining(["mehndi", "cakeplate", "cakespoon"]));
    expect(ids("walima")).toEqual(expect.arrayContaining(["cakeplate", "cakespoon"]));
    expect(ids("walima")).not.toContain("mehndi");
  });
});

describe("catalogue & checkout integration", () => {
  it("every kit item is a real product whose variants match the config", () => {
    expect(kitProducts).toHaveLength(kitItems.length);
    kitItems.forEach((item, i) => {
      expect(kitProducts[i].variants.map((v) => v.price)).toEqual(item.variants.map((v) => v.price));
    });
  });

  it("the server quote accepts bulk kit quantities but keeps the normal cap elsewhere", async () => {
    const spoon = kitProducts.find((p) => p.id === "kit_spoon")!;
    const q = await buildQuote({
      lines: [
        { productId: spoon.id, variantId: spoon.variants[1].id, quantity: 200 },
        { productId: "p_003", variantId: "ee-mb-fav-v1", quantity: 30 },
      ],
      shippingMethod: "standard",
    });
    expect(q.lines[0].quantity).toBe(200);
    expect(q.lines[0].unitPrice).toBe(150);
    expect(q.lines[1].quantity).toBe(20); // 30 in stock, but normal products stay capped at 20
  });
});
