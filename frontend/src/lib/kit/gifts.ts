import type { ImageAsset, Paise, Product } from "../types";
import { variantLabel } from "../utils";
import { getKitCatalog } from "./catalog";

/**
 * Giveaways: everyday shop products (hampers, favours, chocolates…) the
 * shopper adds to their kit for the guests to take home. They travel with
 * the kit — in its link, saved kits and the bag — and are priced from the
 * catalogue like every other line; checkout re-prices them on the server.
 */
export interface KitGift {
  productId: string;
  variantId: string;
  qty: number;
}

export const KIT_GIFTS_MAX = 12;

/** A shop product as the giveaway picker needs it (kept small: it's sent to every page). */
export interface GiftProduct {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  image: ImageAsset;
  variants: { id: string; label: string; price: Paise; compareAtPrice?: Paise; stock: number }[];
}

/** Active everyday products with a photo and a fixed price (kit products and "price on request" ones are left out). */
export function giftProductsFrom(products: Product[]): GiftProduct[] {
  return products
    .filter((p) => !p.kit && p.status === "active" && !p.customization?.quoteOnRequest && p.variants.length > 0 && p.images.length > 0)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      categorySlug: p.categorySlug,
      image: p.images[0],
      variants: p.variants.map((v) => ({
        id: v.id,
        label: variantLabel(v.options),
        price: v.price,
        ...(v.compareAtPrice && { compareAtPrice: v.compareAtPrice }),
        stock: v.stock,
      })),
    }));
}

export interface GiftLine {
  gift: KitGift;
  product: GiftProduct;
  variant: GiftProduct["variants"][number];
  unitPrice: Paise;
  lineTotal: Paise;
  /** More wanted than the shop has in stock. */
  short: boolean;
}

/** The kit's giveaways priced from today's catalogue; ones no longer sold are left out. */
export function giftLines(gifts: KitGift[] | undefined, products: GiftProduct[] = getKitCatalog().gifts): GiftLine[] {
  return (gifts ?? []).flatMap((gift) => {
    const product = products.find((p) => p.id === gift.productId);
    const variant = product?.variants.find((v) => v.id === gift.variantId);
    if (!product || !variant) return [];
    return [{ gift, product, variant, unitPrice: variant.price, lineTotal: variant.price * gift.qty, short: gift.qty > variant.stock }];
  });
}

export const giftsTotal = (lines: GiftLine[]) => lines.reduce((sum, l) => sum + l.lineTotal, 0);
