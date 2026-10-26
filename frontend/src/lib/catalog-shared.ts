import { z } from "zod";
import type { Category, ImageAsset, Product, ProductVariant } from "./types";

/**
 * Catalogue types and pure helpers, safe for both server and browser code.
 * Database reads live in `catalog.ts` (server only).
 */

export const LOW_STOCK_THRESHOLD = 5;
export const PAGE_SIZE = 12;

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  image: ImageAsset;
  hoverImage?: ImageAsset;
  price: number;
  compareAtPrice?: number;
  hasPriceRange: boolean;
  inStock: boolean;
  lowStock: boolean;
  isNewArrival: boolean;
  /** Present only when the product can be added without choosing options. */
  quickAddVariant?: { id: string; stock: number };
}

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "popular", label: "Most popular" },
] as const;

export type SortValue = (typeof sortOptions)[number]["value"];

const listParamsSchema = z.object({
  category: z.string().trim().max(80).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  min: z.coerce.number().int().min(0).optional().catch(undefined),
  max: z.coerce.number().int().min(0).optional().catch(undefined),
  stock: z.enum(["in"]).optional().catch(undefined),
  colour: z.array(z.string().max(30)).max(12).optional().catch(undefined),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "popular"]).default("featured").catch("featured"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type ListParams = z.infer<typeof listParamsSchema>;

type RawSearchParams = Record<string, string | string[] | undefined>;

/** Normalises untrusted URL search params into a safe query object. */
export function parseListParams(raw: RawSearchParams, overrides: Partial<ListParams> = {}): ListParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const colour = raw.colour === undefined ? undefined : Array.isArray(raw.colour) ? raw.colour : raw.colour.split(",");
  return listParamsSchema.parse({
    category: first(raw.category),
    q: first(raw.q),
    min: first(raw.min) || undefined,
    max: first(raw.max) || undefined,
    stock: first(raw.stock),
    colour: colour?.filter(Boolean),
    sort: first(raw.sort),
    page: first(raw.page),
    ...overrides,
  });
}

export interface ListResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  facets: {
    colours: { value: string; count: number }[];
    categories: { slug: string; name: string; count: number }[];
    price: { min: number; max: number };
  };
}

export interface SearchSuggestions {
  products: Pick<ProductSummary, "slug" | "name" | "image" | "price" | "categoryName">[];
  categories: Pick<Category, "slug" | "name">[];
}

/* -------------------------------- Helpers -------------------------------- */

export const isVisible = (p: Product) => p.status === "active";

export function totalStock(p: Product) {
  return p.variants.reduce((sum, v) => sum + v.stock, 0);
}

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** The price shown on cards: the cheapest variant that's in stock, else the cheapest overall. */
export function displayVariant(p: Product): ProductVariant {
  const pool = p.variants.some((v) => v.stock > 0) ? p.variants.filter((v) => v.stock > 0) : p.variants;
  return pool.reduce((best, v) => (v.price < best.price ? v : best), pool[0]);
}

export function toSummary(p: Product, categoryName: string): ProductSummary {
  const v = displayVariant(p);
  const stock = totalStock(p);
  const { min, max } = priceRange(p);
  const single = p.variants.length === 1 ? p.variants[0] : undefined;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    categoryName,
    image: p.images[0],
    hoverImage: p.images[1],
    price: v.price,
    compareAtPrice: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : undefined,
    hasPriceRange: min !== max,
    inStock: stock > 0,
    lowStock: stock > 0 && stock <= LOW_STOCK_THRESHOLD,
    isNewArrival: p.isNewArrival,
    quickAddVariant: single && single.stock > 0 ? { id: single.id, stock: single.stock } : undefined,
  };
}

export function matchesQuery(p: Product, q: string, categoryName: string) {
  const haystack = [p.name, p.shortDescription, categoryName, p.colour ?? "", ...Object.values(p.attributes)].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function sortProducts(list: Product[], sort: SortValue) {
  const sorted = [...list];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc":
      return sorted.sort((a, b) => displayVariant(a).price - displayVariant(b).price);
    case "price-desc":
      return sorted.sort((a, b) => displayVariant(b).price - displayVariant(a).price);
    case "popular":
      return sorted.sort((a, b) => b.salesCount - a.salesCount);
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(totalStock(b) > 0) - Number(totalStock(a) > 0) ||
          b.salesCount - a.salesCount,
      );
  }
}
