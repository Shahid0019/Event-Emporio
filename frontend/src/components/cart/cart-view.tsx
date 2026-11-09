"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { groupCart, type CartEntry } from "@/lib/cart-groups";
import { activeKitFunctions } from "@/lib/kit/catalog";
import { decodeSharedKit } from "@/lib/kit/shared";
import { startOver } from "@/lib/kit/store";
import { cartCount } from "@/lib/store";
import { CartKitItem, CartLineItem, CouponForm, TotalsTable } from "./cart-parts";
import { useCartTotals } from "./use-cart-totals";

type KitEntry = Extract<CartEntry, { type: "kit" }>;

/** Kits in the traditional order of functions (as the shop orders them), own functions last. */
function inFunctionOrder(kits: KitEntry[]): KitEntry[] {
  const order = activeKitFunctions().map((f) => f.id as string);
  const rank = (k: KitEntry) => {
    const i = order.indexOf(decodeSharedKit(k.bundle.kit)?.occasion ?? "");
    return i === -1 ? order.length : i;
  };
  return [...kits].sort((a, b) => rank(a) - rank(b));
}

/**
 * The wedding bag (handbook screen 06): every planned function in order,
 * each with its own list, plus any other items — one total, one delivery.
 */
export function CartView() {
  const router = useRouter();
  const { lines, code, coupon, offers, totals } = useCartTotals();

  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6 stroke-[1.25]" />}
        title="Your bag is empty"
        description="Plan a function to get a ready shopping list, or explore the shop."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/kit" className={buttonVariants()}>
              Plan My Function
            </Link>
            <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
              Shop products
            </Link>
          </div>
        }
      />
    );
  }

  const entries = groupCart(lines);
  const kits = inFunctionOrder(entries.filter((e): e is KitEntry => e.type === "kit"));
  const items = entries.filter((e): e is Extract<CartEntry, { type: "line" }> => e.type === "line");
  // A fresh plan; the kits already in the bag stay as they are.
  const planAnother = () => {
    startOver();
    router.push("/kit");
  };

  return (
    <div className="mt-6 grid gap-10 sm:mt-10 lg:grid-cols-12 lg:gap-16">
      <section aria-label="Items in your bag" className="space-y-10 lg:col-span-7 xl:col-span-8">
        <section aria-labelledby="bag-functions">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="bag-functions" className="font-serif text-[1.6rem]">
              Your functions
            </h2>
            <span className="text-[0.85rem] text-muted">
              {cartCount(lines)} {cartCount(lines) === 1 ? "item" : "items"}
            </span>
          </div>
          {kits.length > 0 ? (
            <ol className="relative mt-2">
              {kits.map((k, i) => (
                <li key={k.key} className="relative pl-11">
                  {/* Timeline: a numbered dot per function, joined by a line. */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-6 grid size-7 place-items-center rounded-full bg-brand text-[0.8rem] font-semibold text-brand-ink"
                  >
                    {i + 1}
                  </span>
                  {i < kits.length - 1 && <span aria-hidden className="absolute bottom-0 left-[0.8rem] top-14 w-px bg-line-strong" />}
                  <ul>
                    <CartKitItem entry={k} />
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-[0.9rem] text-muted">Plan a function and its shopping list joins this bag.</p>
          )}
          <button
            type="button"
            onClick={planAnother}
            className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-control border border-dashed border-line-strong px-4 text-left transition-colors hover:border-ink active:bg-surface"
          >
            <span className="grid size-8 place-items-center rounded-full bg-surface">
              <Plus aria-hidden className="size-4" />
            </span>
            <span>
              <span className="block font-medium">{kits.length ? "Plan another function" : "Plan My Function"}</span>
              <span className="block text-[0.8rem] text-muted">Mehndi raat, Wazwan, Walima or your own — all in one delivery</span>
            </span>
          </button>
        </section>

        {items.length > 0 && (
          <section aria-labelledby="bag-items">
            <h2 id="bag-items" className="border-b border-line pb-3 font-serif text-[1.6rem]">
              Other items
            </h2>
            <ul className="divide-y divide-line border-b border-line">
              {items.map((e) => (
                <CartLineItem key={e.key} line={e.line} />
              ))}
            </ul>
          </section>
        )}

        <Link href="/shop" className="inline-block text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
          Continue shopping
        </Link>
      </section>

      <aside aria-label="Order summary" className="lg:col-span-5 xl:col-span-4">
        <div className="space-y-6 rounded-card bg-surface p-5 sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="font-serif text-3xl">Bag total</h2>
          <CouponForm coupon={coupon} code={code} offers={offers} />
          <TotalsTable totals={totals} shippingLabel="Delivery (estimate)" />
          <div className="flex items-start gap-3 rounded-control bg-raised px-4 py-3 text-[0.85rem]">
            <Truck aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
            <p>
              <span className="font-medium">One delivery for everything.</span>{" "}
              <span className="text-muted">All your functions and items come together, ahead of your first function.</span>
            </p>
          </div>
          <Link href="/checkout" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Continue to checkout
          </Link>
          <p className="text-center text-[0.75rem] leading-relaxed text-muted">
            Prices and stock are confirmed again before payment. Guest checkout available.
          </p>
        </div>
      </aside>
    </div>
  );
}
