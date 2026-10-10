import { z } from "zod";
import { categories, collections } from "./data/categories";
import { products } from "./data/products";
import type { Category, ImageAsset, Product, ProductVariant } from "./types";

/**
 * Catalogue query layer.
 * Today this reads the bundled demo data; the function signatures mirror
 * what the MongoDB repository will expose, so pages don't change when the
 * backend lands. Everything here runs on the server — the browser only
 * ever receives the page of results it needs.
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
  collection: z.string().trim().max(80).optional().catch(undefined),
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
    collection: first(raw.collection),
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

/* ------------------------------------------------------------------ */

function visible(p: Product) {
  return p.status === "active";
}

export function totalStock(p: Product) {
  return p.variants.reduce((sum, v) => sum + v.stock, 0);
}

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** The price shown on cards: the cheapest variant that's in stock, else the cheapest overall. */
function displayVariant(p: Product): ProductVariant {
  const pool = p.variants.some((v) => v.stock > 0) ? p.variants.filter((v) => v.stock > 0) : p.variants;
  return pool.reduce((best, v) => (v.price < best.price ? v : best), pool[0]);
}

export function categoryName(slug: string) {
  return categories.find((c) => c.slug === slug)?.name ?? "";
}

export function toSummary(p: Product): ProductSummary {
  const v = displayVariant(p);
  const stock = totalStock(p);
  const { min, max } = priceRange(p);
  const single = p.variants.length === 1 ? p.variants[0] : undefined;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    categoryName: categoryName(p.categorySlug),
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

function matchesQuery(p: Product, q: string) {
  const haystack = [p.name, p.shortDescription, categoryName(p.categorySlug), p.colour ?? "", ...Object.values(p.attributes)]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function sortProducts(list: Product[], sort: SortValue) {
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

export async function listProducts(params: ListParams, pageSize = PAGE_SIZE): Promise<ListResult> {
  let scope = products.filter(visible);
  if (params.collection) scope = scope.filter((p) => p.collectionSlugs.includes(params.collection!));
  if (params.q) scope = scope.filter((p) => matchesQuery(p, params.q!));

  // Facet counts reflect the base scope (collection/search) so options never vanish while filtering.
  const facetScope = scope;
  if (params.category) scope = scope.filter((p) => p.categorySlug === params.category);

  const colourScope = scope;
  if (params.min !== undefined) scope = scope.filter((p) => displayVariant(p).price >= params.min! * 100);
  if (params.max !== undefined) scope = scope.filter((p) => displayVariant(p).price <= params.max! * 100);
  if (params.stock === "in") scope = scope.filter((p) => totalStock(p) > 0);
  if (params.colour?.length) scope = scope.filter((p) => p.colour && params.colour!.includes(p.colour));

  const sorted = sortProducts(scope, params.sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(params.page, pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary);

  const colourCounts = new Map<string, number>();
  for (const p of colourScope) if (p.colour) colourCounts.set(p.colour, (colourCounts.get(p.colour) ?? 0) + 1);

  const allPrices = facetScope.map((p) => displayVariant(p).price);

  return {
    items,
    total: sorted.length,
    page,
    pageCount,
    facets: {
      colours: [...colourCounts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value)),
      categories: categories
        .filter((c) => c.isActive)
        .map((c) => ({ slug: c.slug, name: c.name, count: facetScope.filter((p) => p.categorySlug === c.slug).length }))
        .filter((c) => c.count > 0),
      price: { min: allPrices.length ? Math.min(...allPrices) : 0, max: allPrices.length ? Math.max(...allPrices) : 0 },
    },
  };
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug && visible(p));
}

export async function getProductSlugs(): Promise<string[]> {
  return products.filter(visible).map((p) => p.slug);
}

export async function getBestsellers(limit = 8): Promise<ProductSummary[]> {
  return sortProducts(products.filter(visible), "popular").slice(0, limit).map(toSummary);
}

export async function getNewArrivals(limit = 8): Promise<ProductSummary[]> {
  return sortProducts(
    products.filter((p) => visible(p) && p.isNewArrival),
    "newest",
  )
    .slice(0, limit)
    .map(toSummary);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductSummary[]> {
  const pool = products.filter((p) => visible(p) && p.id !== product.id);
  const score = (p: Product) =>
    (p.categorySlug === product.categorySlug ? 3 : 0) + p.collectionSlugs.filter((c) => product.collectionSlugs.includes(c)).length;
  return pool
    .map((p) => ({ p, s: score(p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || b.p.salesCount - a.p.salesCount)
    .slice(0, limit)
    .map(({ p }) => toSummary(p));
}

export async function getProductsBySlugs(slugs: string[]): Promise<ProductSummary[]> {
  return slugs
    .map((slug) => products.find((p) => p.slug === slug && visible(p)))
    .filter((p): p is Product => Boolean(p))
    .map(toSummary);
}

export interface SearchSuggestions {
  products: Pick<ProductSummary, "slug" | "name" | "image" | "price" | "categoryName">[];
  categories: Pick<Category, "slug" | "name">[];
}

export async function searchSuggestions(q: string, limit = 5): Promise<SearchSuggestions> {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { products: [], categories: [] };
  const lower = query.toLowerCase();
  return {
    products: sortProducts(
      products.filter((p) => visible(p) && matchesQuery(p, query)),
      "popular",
    )
      .slice(0, limit)
      .map(toSummary)
      .map(({ slug, name, image, price, categoryName }) => ({ slug, name, image, price, categoryName })),
    categories: categories
      .filter((c) => c.isActive && c.name.toLowerCase().includes(lower))
      .slice(0, 3)
      .map(({ slug, name }) => ({ slug, name })),
  };
}

export async function getCategories() {
  return categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getCollections() {
  return [...collections].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function productCountFor(filter: { category?: string; collection?: string }) {
  return products.filter(
    (p) =>
      visible(p) &&
      (!filter.category || p.categorySlug === filter.category) &&
      (!filter.collection || p.collectionSlugs.includes(filter.collection)),
  ).length;
}
