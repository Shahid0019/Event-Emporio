import { describe, expect, it } from "vitest";
import { buildKit, NO_PREFS } from "@/lib/kit/buildKit";
import { products } from "@/lib/data/products";
import {
  blankKitDraft,
  draftFromProduct,
  isKitProduct,
  kitInfoOf,
  kitItemFromDraft,
  productFromDraft,
  validateKitDraft,
  type KitProductDraft,
} from "@/lib/kit/kit-product";

const draft = (patch: Partial<KitProductDraft> = {}): KitProductDraft => ({
  ...blankKitDraft(),
  name: "Kahwa flask",
  category: "drinking",
  perTrami: 0.25,
  occasions: ["wazwan", "walima"],
  optionName: "Size",
  options: [
    { name: "1 litre", price: 25000, stock: 40 },
    { name: "2 litre", price: 40000, stock: 20 },
  ],
  ...patch,
});

describe("kit products in the catalogue", () => {
  it("separates kit products from everyday products", () => {
    const kit = products.filter(isKitProduct);
    expect(kit).toHaveLength(20);
    expect(products.find((p) => p.id === "p_001")).toSatisfy((p: (typeof products)[number]) => !isKitProduct(p));
    expect(kitInfoOf(products.find((p) => p.id === "kit_spoon")!)).toEqual({ itemId: "spoon", category: "serving", perTrami: 4 });
  });

  it("falls back to the config for kit products saved before the kit field existed", () => {
    const spoon = { ...products.find((p) => p.id === "kit_spoon")!, kit: undefined };
    expect(kitInfoOf(spoon)?.perTrami).toBe(4);
  });

  it("round-trips an existing kit product without changing ids or prices", () => {
    const spoon = products.find((p) => p.id === "kit_spoon")!;
    const again = productFromDraft(draftFromProduct(spoon), spoon);
    expect(again.variants).toEqual(spoon.variants);
    expect(again.kit).toEqual(spoon.kit);
    expect(again.id).toBe(spoon.id);
  });
});

describe("new kit products", () => {
  it("builds a product with kit info, bulk cap and fresh variant ids", () => {
    const p = productFromDraft(draft());
    expect(p.id).toBe("kit_kahwa-flask");
    expect(p.kit).toEqual({ itemId: "kahwa-flask", category: "drinking", perTrami: 0.25, occasions: ["wazwan", "walima"] });
    expect(p.variants.map((v) => v.id)).toEqual(["kit-kahwa-flask-v1", "kit-kahwa-flask-v2"]);
    expect(p.variants.map((v) => v.options)).toEqual([{ Size: "1 litre" }, { Size: "2 litre" }]);
    expect(p.maxPerOrder).toBeGreaterThan(20);
  });

  it("keeps existing variant ids when options are reordered or added", () => {
    const original = productFromDraft(draft());
    const d = draftFromProduct(original);
    const reordered = productFromDraft(
      { ...d, options: [d.options[1], d.options[0], { name: "5 litre", price: 90000, stock: 5 }] },
      original,
    );
    expect(reordered.variants.map((v) => v.id)).toEqual(["kit-kahwa-flask-v2", "kit-kahwa-flask-v1", "kit-kahwa-flask-v3"]);
  });

  it("works with the kit engine: per-trami quantity and tier defaults", () => {
    const item = kitItemFromDraft(draft());
    const premium = buildKit({ occasion: "walima", trami: 50, tier: "premium", prefs: NO_PREFS }, [item])[0];
    expect(premium.qty).toBe(13); // 50 × 0.25 → 12.5 → 13
    expect(premium.variantIndex).toBe(1);
    expect(buildKit({ occasion: "mehndi", trami: 50, tier: "basic", prefs: NO_PREFS }, [item])).toHaveLength(0);
  });

  it("validates the form", () => {
    expect(validateKitDraft(draft())).toEqual({});
    expect(validateKitDraft(draft({ name: " " })).name).toBeDefined();
    expect(validateKitDraft(draft(), ["kahwa-flask"]).name).toMatch(/already exists/);
    expect(validateKitDraft(draft({ perTrami: 0 })).perTrami).toBeDefined();
    expect(validateKitDraft(draft({ occasions: [] })).occasions).toBeDefined();
    expect(validateKitDraft(draft({ options: [] })).options).toBeDefined();
    expect(
      validateKitDraft(
        draft({
          options: [
            { name: "A", price: 100, stock: 1 },
            { name: "a", price: 200, stock: 1 },
          ],
        }),
      ).options,
    ).toMatch(/different/);
    expect(validateKitDraft(draft({ options: [{ name: "A", price: 0, stock: 1 }] })).options).toMatch(/price/);
  });
});

describe("option photos", () => {
  const photo = (name: string) => ({ src: `https://cdn.example.com/kit/${name}.jpg`, alt: "", width: 800, height: 1000 });

  it("each option can have several photos, each stored once and found again when editing", () => {
    const d = draft();
    d.options = [
      { name: "Plastic", price: 100, stock: 50, photos: [photo("plastic-front"), photo("plastic-pack")] },
      { name: "Wooden", price: 200, stock: 50, photos: [photo("wooden"), photo("wooden-close"), photo("wooden-table")] },
      { name: "Steel", price: 300, stock: 50 },
      { name: "Wooden XL", price: 400, stock: 50, photos: [photo("wooden")] },
    ];
    const p = productFromDraft(d);
    // Main picture, then the five distinct option photos ("wooden" is shared).
    expect(p.images).toHaveLength(6);
    expect(p.variants.map((v) => v.imageIndexes)).toEqual([[1, 2], [3, 4, 5], undefined, [3]]);
    expect(p.variants.map((v) => v.imageIndex)).toEqual([1, 3, undefined, 3]);
    expect(p.images[1].alt).toMatch(/Plastic$/);

    const back = draftFromProduct(p);
    expect(back.options.map((o) => o.photos?.map((x) => x.src.split("/").pop()))).toEqual([
      ["plastic-front.jpg", "plastic-pack.jpg"],
      ["wooden.jpg", "wooden-close.jpg", "wooden-table.jpg"],
      undefined,
      ["wooden.jpg"],
    ]);

    // Reorder and remove: the first photo leads, removed ones leave the product.
    back.options[1] = { ...back.options[1], photos: [back.options[1].photos![2], back.options[1].photos![0]] };
    back.options[0] = { ...back.options[0], photos: [] };
    const again = productFromDraft(back, p);
    expect(again.images.map((x) => x.src.split("/").pop())).toEqual([expect.any(String), "wooden-table.jpg", "wooden.jpg"]);
    expect(again.variants.map((v) => v.imageIndexes)).toEqual([undefined, [1, 2], undefined, [2]]);
  });

  it("older products with a single variant photo still load", () => {
    const p = productFromDraft({ ...draft(), options: [{ name: "Plastic", price: 100, stock: 5, photos: [photo("only")] }] });
    const legacy = { ...p, variants: p.variants.map(({ imageIndexes, ...v }) => (void imageIndexes, v)) };
    expect(draftFromProduct(legacy).options[0].photos?.map((x) => x.src)).toEqual([photo("only").src]);
  });
});
