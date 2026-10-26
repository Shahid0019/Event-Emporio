import { describe, expect, it, beforeEach } from "vitest";
import { cartItemCount, groupCart } from "@/lib/cart-groups";
import { buildKit, kitTotal } from "@/lib/kit/buildKit";
import { decodeSharedKit, type SharedKit } from "@/lib/kit/shared";
import { saveKitToCart } from "@/lib/kit/cart";
import { addToCart, cartStore, kitInCart, removeKitFromCart } from "@/lib/store";
import { buildQuote } from "@/lib/quote";

const wazwan: SharedKit = {
  occasion: "wazwan",
  trami: 50,
  tier: "standard",
  prefs: { bio: false, printed: false, extra: false },
  date: null,
  overrides: {},
};

const single = {
  productId: "p_001",
  variantId: "ee-mb-rose-v1",
  slug: "gilded-rose-mehndi-basket",
  name: "Gilded Rose Mehndi Basket",
  categorySlug: "mehndi-baskets",
  variantLabel: "Small",
  image: { src: "/x.jpg", alt: "", width: 1, height: 1 },
  unitPrice: 149900,
  quantity: 2,
  maxQuantity: 12,
};

describe("kits in the bag", () => {
  beforeEach(() => cartStore.set([]));

  it("adds a whole kit as ONE item, with its items underneath", () => {
    addToCart(single);
    const id = saveKitToCart(wazwan, buildKit(wazwan));
    const entries = groupCart(cartStore.get());
    expect(entries.map((e) => e.type)).toEqual(["line", "kit"]);
    const kit = entries[1];
    if (kit.type !== "kit") throw new Error("expected a kit");
    expect(kit.bundle.id).toBe(id);
    expect(kit.bundle.name).toBe("Wazwan kit · 50 trami");
    expect(kit.lines).toHaveLength(16);
    expect(kit.total).toBe(kitTotal(buildKit(wazwan)));
    // Badge count: 2 baskets + 1 kit.
    expect(cartItemCount(cartStore.get())).toBe(3);
  });

  it("stores the kit so Edit kit can reopen it exactly", () => {
    const id = saveKitToCart(wazwan, buildKit(wazwan));
    expect(decodeSharedKit(kitInCart(id)?.kit)).toMatchObject({ occasion: "wazwan", trami: 50, tier: "standard" });
  });

  it("updating a kit replaces it in place instead of adding a second one", () => {
    addToCart(single);
    const id = saveKitToCart(wazwan, buildKit(wazwan));
    addToCart({ ...single, productId: "p_003", variantId: "ee-mb-fav-v1" });
    const bigger = { ...wazwan, trami: 80 };
    expect(saveKitToCart(bigger, buildKit(bigger), id)).toBe(id);
    const entries = groupCart(cartStore.get());
    expect(entries.map((e) => e.type)).toEqual(["line", "kit", "line"]);
    expect(entries.filter((e) => e.type === "kit")).toHaveLength(1);
    expect(cartStore.get().find((l) => l.productId === "kit_spoon")?.quantity).toBe(320);
  });

  it("the same product as a single item and inside a kit stay separate lines", () => {
    addToCart({ ...single, productId: "kit_spoon", variantId: "kit-spoon-v2", maxQuantity: 20000, maxPerOrder: 10000, quantity: 5 });
    saveKitToCart(wazwan, buildKit(wazwan));
    expect(cartStore.get().filter((l) => l.variantId === "kit-spoon-v2")).toHaveLength(2);
  });

  it("removing a kit removes all of its items and nothing else", () => {
    addToCart(single);
    const id = saveKitToCart(wazwan, buildKit(wazwan));
    removeKitFromCart(id);
    expect(cartStore.get()).toHaveLength(1);
    expect(kitInCart(id)).toBeUndefined();
  });

  it("checkout prices a kit item by item on the server", async () => {
    saveKitToCart(wazwan, buildKit(wazwan));
    saveKitToCart({ ...wazwan, trami: 100 }, buildKit({ ...wazwan, trami: 100 }));
    const lines = cartStore.get().map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));
    const q = await buildQuote({ lines, shippingMethod: "standard" });
    expect(q.issues).toHaveLength(0);
    expect(q.totals.subtotal).toBe(cartStore.get().reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  });
});
