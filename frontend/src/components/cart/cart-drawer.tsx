"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { storeSettings } from "@/lib/data/settings";
import { cartCount, setCartOpen, uiStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { CartEntries, CouponForm, TotalsTable } from "./cart-parts";
import { useCartTotals } from "./use-cart-totals";

export function CartDrawer() {
  const open = uiStore.useStore((s) => s.cartOpen);
  const { lines, code, coupon, offers, totals } = useCartTotals();
  const close = () => setCartOpen(false);
  const count = cartCount(lines);

  return (
    <Sheet
      open={open}
      onOpenChange={setCartOpen}
      title={`Your bag${count ? ` (${count})` : ""}`}
      side="right"
      bodyClassName="py-0"
      headerAction={
        lines.length > 0 && (
          <Link
            href="/cart"
            onClick={close}
            className="mr-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            View bag
          </Link>
        )
      }
      footer={
        lines.length > 0 ? (
          <div className="space-y-4">
            <CouponForm coupon={coupon} code={code} offers={offers} />
            <TotalsTable totals={totals} shippingLabel="Shipping (estimate)" showTotal={false} />
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">Total</p>
                <p className="mt-1 font-serif text-[1.6rem] leading-none tabular-nums">{formatPrice(totals.total)}</p>
                {storeSettings.pricesIncludeTax && <p className="mt-1 text-[0.7rem] text-muted">Incl. taxes</p>}
              </div>
              <Link href="/checkout" onClick={close} className={buttonVariants({ size: "md", className: "shrink-0" })}>
                Checkout <ArrowRight />
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
        <CartEntries lines={lines} onNavigate={close} compact />
      )}
    </Sheet>
  );
}
