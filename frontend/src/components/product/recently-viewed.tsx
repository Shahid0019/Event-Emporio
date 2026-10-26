"use client";

import { useEffect, useState } from "react";
import type { ProductSummary } from "@/lib/catalog-shared";
import { recentStore } from "@/lib/store";
import { ProductRail } from "./product-rail";

/** Recently viewed products — stored only in this browser, never sent to analytics. */
export function RecentlyViewed({ excludeSlug }: { excludeSlug: string }) {
  const recent = recentStore.useStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const key = recent
    .filter((s) => s !== excludeSlug)
    .slice(0, 8)
    .join(",");

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ProductSummary[]) => setProducts(data))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  if (!key || !products.length) return null;

  return (
    <section aria-labelledby="recent-title" className="container-luxe overflow-hidden pb-24">
      <div className="flex items-end justify-between gap-6 border-t border-line pt-16">
        <h2 id="recent-title" className="text-h2">
          Recently <em className="text-brand">viewed</em>
        </h2>
        <button
          type="button"
          onClick={() => recentStore.set([])}
          className="text-[0.72rem] uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear history
        </button>
      </div>
      <div className="mt-8">
        <ProductRail products={products} label="Recently viewed" />
      </div>
    </section>
  );
}
