import {
  isVisible,
  matchesQuery,
  PAGE_SIZE,
  sortProducts,
  toSummary,
  type ListParams,
  type ListResult,
  type ProductSummary,
  type SearchSuggestions,
} from "./catalog-shared";
import { loadCatalog, type CatalogSnapshot } from "./db/queries";
import type { Category, Product } from "./types";

/**
 * Catalogue reads (server only), backed by the database through cached
 * loaders — the browser only ever receives the page of results it needs.
 * Types and pure helpers live in catalog-shared.ts.
 */
export * from "./catalog-shared";

const nameOf = (cat: CatalogSnapshot, slug: string) => cat.categories.find((c) => c.slug === slug)?.name ?? "";
const summarise = (cat: CatalogSnapshot) => (p: Product) => toSummary(p, nameOf(cat, p.categorySlug));

export async function categoryName(slug: string) {
  return nameOf(await loadCatalog(), slug);
}

export async function listProducts(params: ListParams, pageSize = PAGE_SIZE): Promise<ListResult> {
  const cat = await loadCatalog();
  let scope = cat.products.filter(isVisible);
  if (params.q) scope = scope.filter((p) => matchesQuery(p, params.q!, nameOf(cat, p.categorySlug)));

  // Facet counts reflect the base scope (search) so options never vanish while filtering.
  const facetScope = scope;
  if (params.category) scope = scope.filter((p) => p.categorySlug === params.category);

  const colourScope = scope;
  const price = (p: Product) => summarise(cat)(p).price;
  if (params.min !== undefined) scope = scope.filter((p) => price(p) >= params.min! * 100);
  if (params.max !== undefined) scope = scope.filter((p) => price(p) <= params.max! * 100);
  if (params.stock === "in") scope = scope.filter((p) => p.variants.some((v) => v.stock > 0));
  if (params.colour?.length) scope = scope.filter((p) => p.colour && params.colour!.includes(p.colour));

  const sorted = sortProducts(scope, params.sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(params.page, pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(summarise(cat));

  const colourCounts = new Map<string, number>();
  for (const p of colourScope) if (p.colour) colourCounts.set(p.colour, (colourCounts.get(p.colour) ?? 0) + 1);
  const allPrices = facetScope.map(price);

  return {
    items,
    total: sorted.length,
    page,
    pageCount,
    facets: {
      colours: [...colourCounts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value)),
      categories: cat.categories
        .filter((c) => c.isActive)
        .map((c) => ({ slug: c.slug, name: c.name, count: facetScope.filter((p) => p.categorySlug === c.slug).length }))
        .filter((c) => c.count > 0),
      price: { min: allPrices.length ? Math.min(...allPrices) : 0, max: allPrices.length ? Math.max(...allPrices) : 0 },
    },
  };
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await loadCatalog()).products.find((p) => p.slug === slug && isVisible(p));
}

export async function getProductSlugs(): Promise<string[]> {
  return (await loadCatalog()).products.filter(isVisible).map((p) => p.slug);
}

export async function getBestsellers(limit = 8): Promise<ProductSummary[]> {
  const cat = await loadCatalog();
  // Kit items are sold through kits, not as bestsellers on their own.
  return sortProducts(
    cat.products.filter((p) => isVisible(p) && !p.kit),
    "popular",
  )
    .slice(0, limit)
    .map(summarise(cat));
}

export async function getNewArrivals(limit = 8): Promise<ProductSummary[]> {
  const cat = await loadCatalog();
  return sortProducts(
    cat.products.filter((p) => isVisible(p) && p.isNewArrival),
    "newest",
  )
    .slice(0, limit)
    .map(summarise(cat));
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductSummary[]> {
  const cat = await loadCatalog();
  const pool = cat.products.filter((p) => isVisible(p) && p.id !== product.id);
  return pool
    .filter((p) => p.categorySlug === product.categorySlug)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit)
    .map(summarise(cat));
}

export async function getProductsBySlugs(slugs: string[]): Promise<ProductSummary[]> {
  const cat = await loadCatalog();
  return slugs
    .map((slug) => cat.products.find((p) => p.slug === slug && isVisible(p)))
    .filter((p): p is Product => Boolean(p))
    .map(summarise(cat));
}

export async function searchSuggestions(q: string, limit = 5): Promise<SearchSuggestions> {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { products: [], categories: [] };
  const cat = await loadCatalog();
  const lower = query.toLowerCase();
  return {
    products: sortProducts(
      cat.products.filter((p) => isVisible(p) && matchesQuery(p, query, nameOf(cat, p.categorySlug))),
      "popular",
    )
      .slice(0, limit)
      .map(summarise(cat))
      .map(({ slug, name, image, price, categoryName }) => ({ slug, name, image, price, categoryName })),
    categories: cat.categories
      .filter((c) => c.isActive && c.name.toLowerCase().includes(lower))
      .slice(0, 3)
      .map(({ slug, name }) => ({ slug, name })),
  };
}

export async function getCategories(): Promise<Category[]> {
  return (await loadCatalog()).categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function productCountFor(filter: { category?: string }) {
  return (await loadCatalog()).products.filter((p) => isVisible(p) && (!filter.category || p.categorySlug === filter.category))
    .length;
}
