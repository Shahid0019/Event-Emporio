"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { cartCount, setCartOpen, uiStore } from "@/lib/store";
import { CartLineItem, CouponForm, TotalsTable } from "./cart-parts";
import { useCartTotals } from "./use-cart-totals";

export function CartDrawer() {
  const open = uiStore.useStore((s) => s.cartOpen);
  const { lines, code, coupon, totals } = useCartTotals();
  const close = () => setCartOpen(false);
  const count = cartCount(lines);

  return (
    <Sheet
      open={open}
      onOpenChange={setCartOpen}
      title={`Your bag${count ? ` (${count})` : ""}`}
      side="right"
      bodyClassName="py-0"
      footer={
        lines.length > 0 ? (
          <div className="space-y-5">
            <CouponForm coupon={coupon} code={code} />
            <TotalsTable totals={totals} shippingLabel="Shipping (estimate)" />
            <div className="grid gap-2">
              <Link href="/checkout" onClick={close} className={buttonVariants({ size: "lg", className: "w-full" })}>
                Checkout
              </Link>
              <Link href="/cart" onClick={close} className={buttonVariants({ variant: "ghost", size: "md", className: "w-full" })}>
                View bag
              </Link>
            </div>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-6 stroke-[1.25]" />}
          title="Your bag is empty"
          description="Discover mehndi baskets, bridal hampers and gifts made to be remembered."
          action={
            <Button asChild onClick={close}>
              <Link href="/shop">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <CartLineItem key={line.key} line={line} onNavigate={close} compact />
          ))}
        </ul>
      )}
    </Sheet>
  );
}
