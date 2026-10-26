import { beforeEach, describe, expect, it } from "vitest";
import { activeLines, buildKit, kitTotal, NO_PREFS, swapSuggestions, variantsInKit, type KitInput } from "@/lib/kit/buildKit";
import { saveKitToCart } from "@/lib/kit/cart";
import { kitItemById } from "@/lib/kit/catalog";
import { decodeSharedKit, encodeSharedKit, type SharedKit } from "@/lib/kit/shared";
import { cartStore } from "@/lib/store";
import {
  addToKit,
  answerDate,
  answerExactDate,
  bucketForDate,
  daysUntil,
  dropSuggestedType,
  goBack,
  kitStore,
  loadCompleteKit,
  removeWholeItem,
  restoreAdditions,
  setQty,
} from "@/lib/kit/store";

const spoon = kitItemById("spoon")!;
const wooden = spoon.variants.findIndex((v) => /wood/i.test(v.name));
const base: KitInput = { occasion: "wazwan", trami: 50, tier: "basic", prefs: NO_PREFS };

describe("items added to a kit", () => {
  it("adds another type of an item as its own line, priced on its own", () => {
    const plain = buildKit(base);
    const lines = buildKit({ ...base, added: [{ id: "a1", itemId: "spoon", variantIndex: wooden, qty: 80 }] });
    expect(lines).toHaveLength(plain.length + 1);

    const extra = lines.at(-1)!;
    expect(extra).toMatchObject({ lineId: "add:a1", additionId: "a1", itemId: "spoon", variantIndex: wooden, qty: 80 });
    expect(extra.lineTotal).toBe(spoon.variants[wooden].price * 80);
    expect(kitTotal(lines)).toBe(kitTotal(plain) + extra.lineTotal);
    // Both spoon types are now in the kit.
    expect(variantsInKit(lines, "spoon")).toEqual(new Set([plain.find((l) => l.itemId === "spoon")!.variantIndex, wooden]));
  });

  it("can add an item this occasion doesn't include", () => {
    expect(buildKit(base).some((l) => l.itemId === "potli")).toBe(false);
    const lines = buildKit({ ...base, added: [{ id: "a1", itemId: "potli", variantIndex: 0, qty: 50 }] });
    expect(activeLines(lines).some((l) => l.itemId === "potli")).toBe(true);
  });

  it("ignores unknown items and keeps quantities sensible", () => {
    const lines = buildKit({
      ...base,
      added: [
        { id: "a1", itemId: "nope", variantIndex: 0, qty: 5 },
        { id: "a2", itemId: "spoon", variantIndex: 99, qty: -3 },
      ],
    });
    const extra = lines.filter((l) => l.additionId);
    expect(extra).toHaveLength(1);
    expect(extra[0]).toMatchObject({ variantIndex: 0, qty: 1 });
  });

  it("never suggests swapping an added line, or into a type that's already its own line", () => {
    const lines = buildKit({ ...base, tier: "premium", added: [{ id: "a1", itemId: "spoon", variantIndex: 0, qty: 10 }] });
    const suggestions = swapSuggestions(lines, 50);
    expect(suggestions.every((s) => !(s.itemId === "spoon" && s.toIndex === 0))).toBe(true);
  });

  it("travels in kit links", () => {
    const kit: SharedKit = {
      ...base,
      date: null,
      overrides: {},
      added: [
        { id: "a1", itemId: "spoon", variantIndex: wooden, qty: 80 },
        { id: "a2", itemId: "potli", variantIndex: 1, qty: 30 },
      ],
    };
    const decoded = decodeSharedKit(encodeSharedKit(kit))!;
    expect(decoded.added).toEqual(kit.added);
    expect(kitTotal(buildKit(decoded))).toBe(kitTotal(buildKit(kit)));
    // Links without added items are unchanged.
    expect(decodeSharedKit(encodeSharedKit({ ...kit, added: [] }))!.added).toBeUndefined();
  });

  describe("in the bag", () => {
    beforeEach(() => cartStore.set([]));

    it("goes in as part of the one kit; the same type on two lines becomes one bag line", () => {
      const suggestedVariant = buildKit(base).find((l) => l.itemId === "spoon")!.variantIndex;
      const kit: SharedKit = {
        ...base,
        date: null,
        overrides: {},
        added: [
          { id: "a1", itemId: "spoon", variantIndex: wooden, qty: 80 },
          { id: "a2", itemId: "spoon", variantIndex: suggestedVariant, qty: 7 },
        ],
      };
      const lines = buildKit(kit);
      saveKitToCart(kit, lines);
      const bag = cartStore.get();
      expect(new Set(bag.map((l) => l.bundle?.id)).size).toBe(1);
      const spoonLines = bag.filter((l) => l.productId === "kit_spoon");
      expect(spoonLines).toHaveLength(2);
      expect(spoonLines.reduce((n, l) => n + l.quantity, 0)).toBe(lines.filter((l) => l.itemId === "spoon").reduce((n, l) => n + l.qty, 0));
      expect(bag.reduce((n, l) => n + l.unitPrice * l.quantity, 0)).toBe(kitTotal(lines));
    });
  });
});

describe("several types of one item", () => {
  const start = () => loadCompleteKit({ occasion: "wazwan", trami: 50, tier: "basic", prefs: NO_PREFS, date: null, overrides: {} });
  const current = () => {
    const s = kitStore.get();
    return buildKit({ occasion: s.occasion!, trami: s.trami, tier: s.tier!, prefs: s.prefs, overrides: s.overrides, added: s.added });
  };
  const spoons = () => current().filter((l) => l.itemId === "spoon" && !l.removed);

  it("100 plastic and 50 wooden spoons", () => {
    start();
    setQty("spoon", 100);
    expect(addToKit("spoon", wooden, 50).kind).toBe("added");
    expect(spoons().map((l) => [spoon.variants[l.variantIndex].name, l.qty])).toEqual([
      ["Plastic small", 100],
      ["Wooden small", 50],
    ]);
    // The same type can't be added twice.
    expect(addToKit("spoon", wooden).kind).toBe("exists");
  });

  it("removing the suggested type keeps the other one", () => {
    start();
    setQty("spoon", 100);
    addToKit("spoon", wooden, 50);
    dropSuggestedType("spoon");
    expect(spoons().map((l) => [l.variantIndex, l.qty, Boolean(l.additionId)])).toEqual([[wooden, 50, false]]);
    expect(kitStore.get().added).toEqual([]);
  });

  it("removing the whole item takes every type out; Add back brings the suggested one", () => {
    start();
    addToKit("spoon", wooden, 50);
    const gone = removeWholeItem("spoon");
    expect(gone).toHaveLength(1);
    expect(spoons()).toHaveLength(0);
    restoreAdditions(gone);
    expect(spoons()).toHaveLength(1);
  });
});

describe("function date", () => {
  const today = new Date(2026, 9, 19); // 19 Oct 2026, local time

  it("counts whole days from today", () => {
    expect(daysUntil("2026-10-19", today)).toBe(0);
    expect(daysUntil("2026-10-20", today)).toBe(1);
    expect(daysUntil("2026-11-19", today)).toBe(31);
  });

  it("an exact date also answers which week it falls in", () => {
    expect(bucketForDate("2026-10-24", today)).toBe("this-week");
    expect(bucketForDate("2026-11-01", today)).toBe("two-weeks");
    expect(bucketForDate("2026-12-25", today)).toBe("next-month");
  });

  it("picking a date, then a quick answer, keeps only the quick answer", () => {
    loadCompleteKit({ occasion: "wazwan", trami: 50, tier: "basic", prefs: NO_PREFS, date: null, overrides: {} });
    answerExactDate("2027-01-10");
    expect(kitStore.get()).toMatchObject({ eventDate: "2027-01-10", date: "next-month" });
    answerDate("undecided");
    expect(kitStore.get().eventDate).toBeUndefined();
  });

  it("going back one question keeps the answers", () => {
    loadCompleteKit({ occasion: "wazwan", trami: 50, tier: "basic", prefs: NO_PREFS, date: null, overrides: {} });
    goBack();
    expect(kitStore.get()).toMatchObject({ step: 4, furthest: 5, trami: 50, tier: "basic" });
  });
});

describe("kits the shop builds with added items", () => {
  const extra = [{ id: "a1", itemId: "spoon", variantIndex: wooden, qty: 50 }];

  it("a customer kit's link carries the added items", async () => {
    const { toSharedKit, blankAdminKit } = await import("@/lib/kit/admin-kits");
    const kit = { ...blankAdminKit(), added: extra };
    const decoded = decodeSharedKit(encodeSharedKit(toSharedKit(kit)))!;
    expect(decoded.added).toEqual(extra);
  });
});
