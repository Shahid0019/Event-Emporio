import type { Document } from "mongodb";
import { cacheLife, cacheTag } from "next/cache";
import { buildKitCatalog, setKitCatalog, type KitCatalog } from "../kit/catalog";
import type { KitFunction } from "../kit/config";
import { defaultStoreSettings, type SiteContent, type StoreSettings } from "../settings";
import type { Category, Product, ProductReview } from "../types";
import { getDb, plain, plainAll } from "./client";

/**
 * Cached reads for the storefront. Each is tagged so an admin save can
 * refresh exactly what changed (see `revalidateStore` in admin actions):
 *   catalog  → products, categories
 *   kits     → kit functions
 *   content  → announcements, hero, testimonials
 *   settings → contact, shipping, payments
 *   reviews  → approved product reviews
 */
export const TAGS = { catalog: "catalog", kits: "kits", content: "content", settings: "settings", reviews: "reviews" } as const;

/** cacheTag/cacheLife only exist inside Next's `use cache`; unit tests call these loaders directly. */
function tag(...tags: string[]) {
  if (process.env.VITEST) return;
  cacheTag(...tags);
  cacheLife("hours");
}

export interface CatalogSnapshot {
  products: Product[];
  categories: Category[];
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  "use cache";
  tag(TAGS.catalog);
  const db = await getDb();
  const [products, categories] = await Promise.all([
    db.collection("products").find({}).sort({ createdAt: -1 }).toArray(),
    db.collection("categories").find({}).sort({ displayOrder: 1 }).toArray(),
  ]);
  return {
    products: plainAll<Product>(products),
    categories: plainAll<Category>(categories),
  };
}

/** Every kit function (hidden ones too — old kits still show their names), in the shop's order. */
export async function loadKitFunctions(): Promise<KitFunction[]> {
  "use cache";
  tag(TAGS.kits);
  const db = await getDb();
  const docs = await db.collection("kitFunctions").find({}).sort({ sortOrder: 1 }).toArray();
  return plainAll<KitFunction>(docs);
}

/** A product's approved customer reviews, newest first. */
export async function loadProductReviews(productId: string): Promise<ProductReview[]> {
  "use cache";
  tag(TAGS.reviews);
  const db = await getDb();
  const docs = await db.collection("productReviews").find({ productId, status: "approved" }).sort({ createdAt: -1 }).limit(200).toArray();
  return plainAll<ProductReview>(docs);
}

/** The newest approved product reviews across the shop, for the home page. */
export async function loadLatestReviews(limit = 30): Promise<ProductReview[]> {
  "use cache";
  tag(TAGS.reviews);
  const db = await getDb();
  const docs = await db.collection("productReviews").find({ status: "approved" }).sort({ createdAt: -1 }).limit(limit).toArray();
  return plainAll<ProductReview>(docs);
}

export async function loadContent(): Promise<SiteContent> {
  "use cache";
  tag(TAGS.content);
  const db = await getDb();
  const docs = await db.collection<{ _id: string; items?: unknown }>("content").find({}).toArray();
  const byId: Record<string, Document> = Object.fromEntries(docs.map((d) => [d._id, d]));
  const hero = plain<SiteContent["hero"]>(byId.hero ?? null);
  return {
    announcements: (byId.announcements?.items as SiteContent["announcements"]) ?? [],
    hero: hero!,
    testimonials: (byId.testimonials?.items as SiteContent["testimonials"]) ?? [],
  };
}

export async function loadSettings(): Promise<StoreSettings> {
  "use cache";
  tag(TAGS.settings);
  const db = await getDb();
  const doc = plain<StoreSettings>(await db.collection<{ _id: string }>("settings").findOne({ _id: "store" }));
  return { ...defaultStoreSettings, ...doc };
}

/** Kit items, kit products and kit functions, from the database. */
export async function loadKitCatalog(): Promise<KitCatalog> {
  const [{ products }, functions] = await Promise.all([loadCatalog(), loadKitFunctions()]);
  return buildKitCatalog(products, functions);
}

/**
 * Fills the shared kit registry on the server before kit pages render, so
 * prices and items always match the database. Returns the catalogue so the
 * page can also pass it to the browser.
 */
export async function primeKitCatalog(): Promise<KitCatalog> {
  const catalog = await loadKitCatalog();
  setKitCatalog(catalog);
  return catalog;
}
