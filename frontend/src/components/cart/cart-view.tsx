"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { cartCount } from "@/lib/store";
import { CartLineItem, CouponForm, TotalsTable } from "./cart-parts";
import { useCartTotals } from "./use-cart-totals";

export function CartView() {
  const { lines, code, coupon, totals } = useCartTotals();

  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6 stroke-[1.25]" />}
        title="Your bag is empty"
        description="Looks like you haven't added anything yet. Explore the collections to find something special."
        action={
          <Link href="/shop" className={buttonVariants()}>
            Continue shopping
          </Link>
        }
      />
    );
  }

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
      <section aria-label="Items in your bag" className="lg:col-span-7 xl:col-span-8">
        <p className="border-b border-line pb-4 text-[0.85rem] text-muted">
          {cartCount(lines)} {cartCount(lines) === 1 ? "item" : "items"}
        </p>
        <ul className="divide-y divide-line border-b border-line">
          {lines.map((line) => (
            <CartLineItem key={line.key} line={line} />
          ))}
        </ul>
        <Link href="/shop" className="mt-8 inline-block text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
          Continue shopping
        </Link>
      </section>

      <aside aria-label="Order summary" className="lg:col-span-5 xl:col-span-4">
        <div className="space-y-6 rounded-card bg-surface p-6 sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="font-serif text-3xl">Summary</h2>
          <CouponForm coupon={coupon} code={code} />
          <TotalsTable totals={totals} shippingLabel="Shipping (estimate)" />
          <Link href="/checkout" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Proceed to checkout
          </Link>
          <p className="text-center text-[0.75rem] leading-relaxed text-muted">
            Prices and stock are confirmed again before payment. Guest checkout available.
          </p>
        </div>
      </aside>
    </div>
  );
}
