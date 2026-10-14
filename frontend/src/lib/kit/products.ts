import type { ImageAsset, Product } from "../types";
import { slugify } from "../utils";
import { KIT_MAX_PER_ORDER, kitItems, type KitItem } from "./config";

/**
 * Kit items as catalogue products. Generated from the kit config so a
 * price lives in exactly one place; `products.ts` includes these in the
 * one catalogue list. DEMO — prices and stock are placeholders, and the
 * line illustrations in /public/images/kit stand in for product photos.
 */

const DEMO_STOCK = 20000;

/** Illustration for a kit item; swap the file for a real product photo (keep the 4:5 shape). */
export function kitImage(item: Pick<KitItem, "id" | "name">): ImageAsset {
  return { src: `/images/kit/${item.id}.svg`, alt: `${item.name} illustration`, width: 400, height: 500 };
}

export const kitProductId = (itemId: string) => `kit_${itemId}`;
export const kitVariantId = (itemId: string, index: number) => `kit-${itemId}-v${index + 1}`;

function toProduct(item: KitItem): Product {
  const sku = `EE-KIT-${item.id.toUpperCase()}`;
  const per = item.perTrami >= 1 ? `${item.perTrami} per trami` : `1 per ${Math.round(1 / item.perTrami)} trami`;
  return {
    id: kitProductId(item.id),
    slug: slugify(item.name),
    sku,
    name: item.name,
    shortDescription: `Wedding ${item.name.toLowerCase()} in ${item.variants.length} options, sold loose in any quantity.`,
    description: [
      `${item.name} for Kashmiri wedding functions. A trami seats four guests — we usually suggest ${per}.`,
      "Building a whole function? The kit builder counts every item per trami for you.",
    ],
    categorySlug: "decorative-disposables",
    collectionSlugs: [],
    images: [kitImage(item)],
    options: [{ name: item.optionName, values: item.variants.map((v) => v.name) }],
    variants: item.variants.map((v, i) => ({
      id: kitVariantId(item.id, i),
      sku: `${sku}-${String(i + 1).padStart(2, "0")}`,
      options: { [item.optionName]: v.name },
      price: v.price,
      stock: DEMO_STOCK,
    })),
    attributes: { "Suggested quantity": per, Sold: "Per piece" },
    maxPerOrder: KIT_MAX_PER_ORDER,
    isFeatured: false,
    isNewArrival: false,
    status: "active",
    salesCount: 0,
    createdAt: "2026-01-15T09:00:00.000Z",
  };
}

export const kitProducts: Product[] = kitItems.map(toProduct);
