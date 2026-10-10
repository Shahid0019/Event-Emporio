"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Button } from "@/components/ui/button";
import { storeSettings } from "@/lib/data/settings";
import { couponStore, MAX_LINE_QUANTITY, removeFromCart, updateCartQuantity } from "@/lib/store";
import type { CartLine, OrderTotals } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import type { CouponResult } from "@/lib/pricing";

export function CartLineItem({ line, onNavigate, compact }: { line: CartLine; onNavigate?: () => void; compact?: boolean }) {
  const max = Math.min(line.maxQuantity, MAX_LINE_QUANTITY);
  return (
    <li className="flex gap-4 py-5 sm:gap-5">
      <Link
        href={`/products/${line.slug}`}
        onClick={onNavigate}
        className={cn("relative shrink-0 overflow-hidden bg-surface", compact ? "aspect-[4/5] w-20" : "aspect-[4/5] w-24 sm:w-28")}
      >
        <Image src={line.image.src} alt={line.image.alt} fill sizes="112px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${line.slug}`} onClick={onNavigate} className="font-serif text-[1.2rem] leading-tight hover:text-brand">
              {line.name}
            </Link>
            {line.variantLabel && <p className="mt-1 text-[0.8rem] text-muted">{line.variantLabel}</p>}
            {line.giftMessage && <p className="mt-1 line-clamp-2 text-[0.8rem] italic text-muted">Gift note: “{line.giftMessage}”</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              removeFromCart(line.key);
              toast(`${line.name} removed from your bag`);
            }}
            aria-label={`Remove ${line.name}`}
            className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <QuantitySelector
            size="sm"
            value={line.quantity}
            max={max}
            onChange={(q) => updateCartQuantity(line.key, q)}
            label={`Quantity for ${line.name}`}
          />
          <div className="text-right">
            <p className="text-[0.95rem] font-medium">{formatPrice(line.unitPrice * line.quantity)}</p>
            {line.quantity > 1 && <p className="text-[0.75rem] text-muted">{formatPrice(line.unitPrice)} each</p>}
          </div>
        </div>
        {line.quantity >= max && (
          <p className="mt-2 text-[0.75rem] text-muted">
            {max === line.maxQuantity ? `Only ${max} available.` : `Maximum ${max} per order — contact us for bulk quantities.`}
          </p>
        )}
      </div>
    </li>
  );
}

export function CouponForm({ coupon, code }: { coupon: CouponResult | null; code: string | null }) {
  const [value, setValue] = useState("");

  if (code) {
    return (
      <div className="flex items-start justify-between gap-3 text-sm">
        <div>
          <p className="inline-flex items-center gap-2 font-medium">
            <Tag className="size-3.5" />
            {code}
          </p>
          {coupon && !coupon.ok && <p className="mt-1 text-[0.8rem] text-danger">{coupon.reason}</p>}
        </div>
        <button
          type="button"
          className="text-[0.75rem] uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-ink"
          onClick={() => couponStore.set(null)}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const next = value.trim().toUpperCase();
        if (!next) return;
        couponStore.set(next);
        setValue("");
      }}
    >
      <label htmlFor="coupon" className="sr-only">
        Discount code
      </label>
      <input
        id="coupon"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Discount code"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-raised px-4 text-sm uppercase placeholder:normal-case focus:border-ink focus:outline-none"
      />
      <Button type="submit" variant="outline" size="sm" className="h-11">
        Apply
      </Button>
    </form>
  );
}

export function TotalsTable({ totals, shippingLabel = "Shipping" }: { totals: OrderTotals; shippingLabel?: string }) {
  const threshold = storeSettings.shipping.freeShippingThreshold;
  const toFree = threshold !== null ? threshold - (totals.subtotal - totals.discount) : 0;
  return (
    <div className="space-y-3 text-[0.92rem]">
      <dl className="space-y-3">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatPrice(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd>−{formatPrice(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">{shippingLabel}</dt>
          <dd>{totals.subtotal === 0 ? "—" : totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</dd>
        </div>
      </dl>
      {threshold !== null && toFree > 0 && totals.subtotal > 0 && (
        <p className="text-[0.78rem] text-muted">Add {formatPrice(toFree)} more for free shipping.</p>
      )}
      <dl className="flex items-baseline justify-between border-t border-line pt-4">
        <dt className="font-medium">Total</dt>
        <dd className="font-serif text-[1.75rem] leading-none">{formatPrice(totals.total)}</dd>
      </dl>
      {storeSettings.pricesIncludeTax && <p className="text-[0.75rem] text-muted">Prices include applicable taxes.</p>}
    </div>
  );
}
