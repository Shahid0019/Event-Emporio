import type { ImageAsset, Product } from "../types";
import { kitItems as starterItems, starterFunctions, type KitFunction, type KitItem } from "./config";
import { giftProductsFrom, type GiftProduct } from "./gifts";
import { kitProducts as starterProducts } from "./products";

/**
 * The live kit catalogue: kit items (from active kit products), the kit
 * products themselves (for cart lines) and the functions the shop offers (wazwan, nikkah… — all set in the admin).
 *
 * It is the same for every visitor, so one shared registry is used on both
 * sides: the server fills it from the database before rendering kit pages,
 * and the browser receives the same data through <KitCatalogProvider>.
 * The starter catalogue in config.ts is only the initial value (and what
 * unit tests use).
 */
export interface KitCatalog {
  items: KitItem[];
  products: Product[];
  /** Every function, hidden ones too (old kits still need their names), in the shop's order. */
  functions: KitFunction[];
  /** Everyday products shoppers can add as giveaways. */
  gifts: GiftProduct[];
}

let current: KitCatalog = {
  items: starterItems,
  products: starterProducts,
  functions: starterFunctions,
  gifts: [],
};

export const getKitCatalog = () => current;

export function setKitCatalog(next: KitCatalog) {
  current = next;
}

export const kitItemById = (id: string) => current.items.find((i) => i.id === id);
export const kitProductForItem = (itemId: string) => current.products.find((p) => p.kit?.itemId === itemId);
export const kitFunctionById = (id: string | null | undefined) => (id ? current.functions.find((f) => f.id === id) : undefined);
/** Functions offered for new kits, in order. */
export const activeKitFunctions = () => current.functions.filter((f) => f.isActive);

/** Turns active kit products into the kit engine's items (option order = variant order). */
export function kitItemsFromProducts(products: Product[]): KitItem[] {
  return products
    .filter((p) => p.kit && p.status === "active" && p.variants.length > 0)
    .map((p) => {
      const kit = p.kit!;
      const optionName = p.options[0]?.name ?? "Type";
      return {
        id: kit.itemId,
        name: p.name,
        category: kit.category,
        perTrami: kit.perTrami,
        ...(kit.occasions && { occasions: kit.occasions }),
        optionName,
        variants: p.variants.map((v) => ({ name: v.options[optionName] ?? Object.values(v.options)[0] ?? "Option", price: v.price })),
      };
    });
}

export function buildKitCatalog(products: Product[], functions: KitFunction[]): KitCatalog {
  const kitProducts = products.filter((p) => p.kit && p.status === "active");
  return {
    items: kitItemsFromProducts(kitProducts),
    products: kitProducts,
    functions: [...functions].sort((a, b) => a.sortOrder - b.sortOrder),
    gifts: giftProductsFrom(products),
  };
}

/** One option's own photos, in order (empty when the shop added none). */
export function kitOptionPhotos(itemId: string, variantIndex: number): ImageAsset[] {
  const product = kitProductForItem(itemId);
  const variant = product?.variants[variantIndex];
  if (!product || !variant) return [];
  const indexes = variant.imageIndexes ?? (variant.imageIndex ? [variant.imageIndex] : []);
  return indexes.filter((i) => i > 0).flatMap((i) => (product.images[i] ? [product.images[i]] : []));
}

/** The picture for one option of a kit item: its first own photo, else the item's picture. */
export function kitOptionImage(itemId: string, variantIndex: number): ImageAsset | undefined {
  return kitOptionPhotos(itemId, variantIndex)[0] ?? kitItemPhotos(itemId)[0];
}

/** True when at least one option of the item has its own photo. */
export const kitHasOptionPhotos = (itemId: string) =>
  Boolean(kitProductForItem(itemId)?.variants.some((v) => v.imageIndexes?.length || v.imageIndex));

/** Photos of the item itself (not claimed by one option), or its illustration when it has none. */
export function kitItemPhotos(itemId: string): ImageAsset[] {
  const product = kitProductForItem(itemId);
  if (!product) return [];
  const owned = new Set(product.variants.flatMap((v) => v.imageIndexes ?? (v.imageIndex ? [v.imageIndex] : [])));
  const own = product.images.filter((_, i) => !owned.has(i));
  return own.length ? own : product.images.slice(0, 1);
}
