import Link from "next/link";
import { Search } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ProductGridSkeleton, Skeleton } from "@/components/ui/primitives";
import { listProducts, parseListParams, type ListParams } from "@/lib/catalog";
import { ActiveFilters, CatalogToolbar, FilterSidebar } from "./filters";

type RawParams = Record<string, string | string[] | undefined>;

/**
 * Server-rendered catalogue results. Filtering, sorting and pagination run
 * on the server from URL params, so every filtered view is shareable and
 * the browser only receives one page of products.
 */
export async function CatalogResults({
  searchParams,
  basePath,
  fixed = {},
}: {
  searchParams: Promise<RawParams>;
  basePath: string;
  fixed?: Partial<Pick<ListParams, "category" | "collection">>;
}) {
  const raw = await searchParams;
  const params = parseListParams(raw, fixed);
  const result = await listProducts(params);
  const locked = Boolean(fixed.category);
  const hasFilters =
    params.min !== undefined || params.max !== undefined || params.stock || params.colour?.length || (params.category && !locked);

  return (
    <div className="grid gap-x-12 lg:grid-cols-[14.5rem_1fr] xl:gap-x-16">
      <FilterSidebar params={params} facets={result.facets} total={result.total} lockedCategory={locked} />
      <div className="min-w-0">
        <CatalogToolbar params={params} facets={result.facets} total={result.total} lockedCategory={locked} />
        <ActiveFilters params={params} lockedCategory={locked} />

        {result.items.length ? (
          <>
            <ProductGrid products={result.items} preloadFirst={4} className="mt-10 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4" />
            <Pagination page={result.page} pageCount={result.pageCount} basePath={basePath} searchParams={raw} />
          </>
        ) : (
          <EmptyState
            icon={<Search className="size-6 stroke-[1.25]" />}
            title={params.q ? `No results for “${params.q}”` : "Nothing matches those filters"}
            description={
              params.q
                ? "Check the spelling, or try a broader word such as hamper, basket or gift."
                : "Try removing a filter or widening the price range."
            }
            action={
              hasFilters ? (
                <Link
                  href={params.q ? `${basePath}?q=${encodeURIComponent(params.q)}` : basePath}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Clear filters
                </Link>
              ) : (
                <Link href="/shop" className={buttonVariants()}>
                  Browse all products
                </Link>
              )
            }
          />
        )}
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-x-12 lg:grid-cols-[14.5rem_1fr] xl:gap-x-16">
      <div className="hidden space-y-4 lg:block">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
      <div>
        <Skeleton className="h-[4.25rem] w-full" />
        <div className="mt-10">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}

/** Editorial page header used by shop, category, collection and search pages. */
export function CatalogHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="pb-10 pt-8 sm:pb-14 sm:pt-12">
      {children}
      {eyebrow && <p className="eyebrow mt-8 text-accent-ink">{eyebrow}</p>}
      <h1 className="mt-4 text-h1">{title}</h1>
      {description && <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted">{description}</p>}
    </header>
  );
}
