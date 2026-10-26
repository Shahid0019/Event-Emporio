import { newId, variantLabel } from "../utils";
import { putKitInCart, kitInCart } from "../store";
import { activeLines, type KitLine } from "./buildKit";
import { getKitCatalog, kitProductForItem } from "./catalog";
import { KIT_MAX_PER_ORDER } from "./config";
import { giftLines } from "./gifts";
import { encodeSharedKit, type SharedKit } from "./shared";
import { kitTitle, tierName } from "./url";

/** "Sana ki Mehndi · 50 trami" (or "Wazwan kit · 50 trami") and "Standard · Bio items · 16 items" for the cart card. */
export function kitCartLabels(kit: SharedKit, itemCount: number) {
  const prefs = [kit.prefs.bio && "Bio items", kit.prefs.printed && "Printed names", kit.prefs.extra && "+10% stock"].filter(Boolean);
  return {
    name: `${kit.title ? kit.title : `${kitTitle(kit)} kit`} · ${kit.guests ? `${kit.guests} guests` : `${kit.trami} trami`}`,
    summary: [
      tierName(kit.tier),
      ...prefs,
      `${itemCount} items`,
      kit.gifts?.length && `${kit.gifts.length} giveaway${kit.gifts.length > 1 ? "s" : ""}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Puts the kit in the bag as ONE item. Pass the id of a kit already in the
 * bag to replace it (after editing) instead of adding a second copy.
 * Prices are display snapshots — checkout re-prices every item on the server.
 * Returns the kit's id in the bag.
 */
export function saveKitToCart(kit: SharedKit, lines: KitLine[], existingId?: string): string {
  const active = activeLines(lines);
  const id = kitInCart(existingId) ? existingId! : newId("kit");
  const { name, summary } = kitCartLabels(kit, active.length);
  const rows = active.flatMap((line) => {
    const product = kitProductForItem(line.itemId);
    const variant = product?.variants[line.variantIndex];
    if (!product || !variant) return [];
    return [
      {
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        categorySlug: product.categorySlug,
        variantLabel: variantLabel(variant.options),
        image: product.images[variant.imageIndex ?? 0] ?? product.images[0],
        unitPrice: variant.price,
        quantity: line.qty,
        maxQuantity: variant.stock,
        maxPerOrder: product.maxPerOrder,
      },
    ];
  });
  // Giveaways are bought in bulk with the kit, so they aren't held to the usual per-line cap.
  const catalogue = getKitCatalog().gifts;
  for (const g of giftLines(kit.gifts, catalogue)) {
    rows.push({
      productId: g.product.id,
      variantId: g.variant.id,
      slug: g.product.slug,
      name: g.product.name,
      categorySlug: g.product.categorySlug,
      variantLabel: g.variant.label,
      image: g.product.image,
      unitPrice: g.variant.price,
      quantity: g.gift.qty,
      maxQuantity: g.variant.stock,
      maxPerOrder: KIT_MAX_PER_ORDER,
    });
  }
  // The same item and type on two lines (e.g. added twice) is one line in the bag.
  const items = rows.reduce<typeof rows>((list, row) => {
    const same = list.find((r) => r.variantId === row.variantId);
    if (same) same.quantity += row.quantity;
    else list.push({ ...row });
    return list;
  }, []);
  putKitInCart(
    {
      id,
      name,
      summary,
      kit: encodeSharedKit({ ...kit, customerName: undefined, note: undefined }),
    },
    items,
  );
  return id;
}
