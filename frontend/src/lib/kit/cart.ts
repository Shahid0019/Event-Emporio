import { addToCart } from "../store";
import { variantLabel } from "../utils";
import { activeLines, type KitLine } from "./buildKit";
import { kitProductId, kitProducts } from "./products";

/**
 * Adds every active kit line to the existing cart. `addToCart` merges a
 * line with the same product + variant already in the bag. Prices are
 * display snapshots — checkout re-prices from the catalogue as usual.
 */
export function addKitToCart(lines: KitLine[]): number {
  let added = 0;
  for (const line of activeLines(lines)) {
    const product = kitProducts.find((p) => p.id === kitProductId(line.itemId));
    const variant = product?.variants[line.variantIndex];
    if (!product || !variant) continue;
    added += addToCart({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      categorySlug: product.categorySlug,
      variantLabel: variantLabel(variant.options),
      image: product.images[0],
      unitPrice: variant.price,
      quantity: line.qty,
      maxQuantity: variant.stock,
      maxPerOrder: product.maxPerOrder,
    });
  }
  return added;
}
