"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Price } from "@/components/ui/primitives";
import type { ProductSummary } from "@/lib/catalog-shared";
import { addToCart, openCart, toggleWishlist, wishlistStore } from "@/lib/store";
import { cn, discountPercent } from "@/lib/utils";

export function ProductCard({
  product,
  sizes = "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 48vw",
  preload,
  className,
}: {
  product: ProductSummary;
  sizes?: string;
  preload?: boolean;
  className?: string;
}) {
  const pct = discountPercent(product.price, product.compareAtPrice);
  const href = `/products/${product.slug}`;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-card bg-surface">
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes={sizes}
            loading={preload ? "eager" : "lazy"}
            className={cn(
              "object-cover transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-luxe)] can-hover:group-hover:scale-[1.04]",
              product.hoverImage && "can-hover:group-hover:opacity-0",
              !product.inStock && "opacity-70",
            )}
          />
          {product.hoverImage && (
            <Image
              src={product.hoverImage.src}
              alt=""
              fill
              sizes={sizes}
              className="hidden scale-[1.04] object-cover opacity-0 transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-luxe)] can-hover:block can-hover:group-hover:scale-100 can-hover:group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!product.inStock ? (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-canvas">
              Sold out
            </span>
          ) : (
            <>
              {product.isNewArrival && (
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-ink">
                  New
                </span>
              )}
              {pct && (
                <span className="rounded-full bg-brand px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-brand-ink">
                  −{pct}%
                </span>
              )}
            </>
          )}
        </div>

        <WishlistButton product={product} className="absolute right-2 top-2" />

        {product.inStock && (
          <div className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-[calc(100%+1rem)] transition-transform duration-500 ease-[var(--ease-luxe)] can-hover:block can-hover:group-hover:translate-y-0 can-hover:group-focus-within:translate-y-0">
            {product.quickAddVariant ? (
              <button
                type="button"
                onClick={() => quickAdd(product)}
                className="h-11 w-full rounded-full bg-canvas/95 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur transition-colors hover:bg-ink hover:text-canvas"
              >
                Add to bag
              </button>
            ) : (
              <Link
                href={href}
                className="grid h-11 w-full place-items-center rounded-full bg-canvas/95 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur transition-colors hover:bg-ink hover:text-canvas"
              >
                Choose options
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-muted">{product.categoryName}</p>
        <h3 className="mt-1.5 font-serif text-[1.2rem] leading-snug sm:text-[1.3rem]">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none [&:focus-visible]:after:outline-2 [&:focus-visible]:after:outline-brand"
          >
            {product.name}
          </Link>
        </h3>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} from={product.hasPriceRange} className="mt-1.5" />
        {product.lowStock && <p className="mt-1 text-[0.75rem] text-accent-ink">Low stock</p>}
      </div>
    </article>
  );
}

function quickAdd(product: ProductSummary) {
  if (!product.quickAddVariant) return;
  const added = addToCart({
    productId: product.id,
    variantId: product.quickAddVariant.id,
    slug: product.slug,
    name: product.name,
    categorySlug: product.categorySlug,
    variantLabel: "",
    image: product.image,
    unitPrice: product.price,
    compareAtPrice: product.compareAtPrice,
    quantity: 1,
    maxQuantity: product.quickAddVariant.stock,
  });
  if (added > 0) {
    toast.success(`${product.name} added to your bag`, { action: { label: "View bag", onClick: openCart } });
  } else {
    toast.error("You already have all available stock in your bag");
  }
}

export function WishlistButton({
  product,
  className,
}: {
  product: Pick<ProductSummary, "id" | "slug" | "name" | "image" | "price">;
  className?: string;
}) {
  const saved = wishlistStore.useStore((items) => items.some((i) => i.productId === product.id));
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={() => {
        const added = toggleWishlist({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
        });
        toast(added ? "Saved to your wishlist" : "Removed from your wishlist");
      }}
      className={cn(
        "relative z-10 grid size-10 place-items-center rounded-full bg-canvas/85 text-ink backdrop-blur transition-[background-color,transform] hover:bg-canvas active:scale-90",
        className,
      )}
    >
      <Heart className={cn("size-[1.05rem] stroke-[1.5] transition-colors", saved && "fill-brand stroke-brand")} />
    </button>
  );
}
