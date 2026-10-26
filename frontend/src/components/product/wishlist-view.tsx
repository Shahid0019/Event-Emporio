"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import type { ProductSummary } from "@/lib/catalog-shared";
import { wishlistStore } from "@/lib/store";
import { ProductGrid } from "./product-grid";

/**
 * Wishlist items are stored as product slugs in the browser; current prices
 * and stock are always fetched fresh from the server.
 */
export function WishlistView() {
  const items = wishlistStore.useStore();
  const key = items.map((i) => i.slug).join(",");
  const [fetched, setFetched] = useState<{ key: string; products: ProductSummary[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((products: ProductSummary[]) => setFetched({ key, products }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  if (!items.length) {
    return (
      <EmptyState
        icon={<Heart className="size-6 stroke-[1.25]" />}
        title="Nothing saved yet"
        description="Tap the heart on any product to save it here for later."
        action={
          <Link href="/shop" className={buttonVariants()}>
            Discover products
          </Link>
        }
      />
    );
  }

  // Keep showing the previous result while a removal refetches, filtered to what's still saved.
  const products = fetched?.products.filter((p) => items.some((i) => i.productId === p.id));

  return (
    <div className="mt-12">
      <p className="mb-8 text-[0.85rem] text-muted">
        {items.length} saved {items.length === 1 ? "piece" : "pieces"}
      </p>
      {products ? (
        <ProductGrid products={products} />
      ) : (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4" role="status" aria-label="Loading wishlist">
          {items.map((i) => (
            <Skeleton key={i.productId} className="aspect-[4/5]" />
          ))}
        </div>
      )}
    </div>
  );
}
