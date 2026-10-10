import type { ProductSummary } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  className,
  preloadFirst = 0,
}: {
  products: ProductSummary[];
  className?: string;
  preloadFirst?: number;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} preload={i < preloadFirst} />
        </li>
      ))}
    </ul>
  );
}
