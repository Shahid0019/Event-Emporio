"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Pencil, Tag, X } from "lucide-react";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/components/providers/store-data";
import { storeSettings } from "@/lib/data/settings";
import { groupCart, type CartEntry } from "@/lib/cart-groups";
import { couponStore, putKitInCart, removeFromCart, removeKitFromCart, updateCartQuantity } from "@/lib/store";
import type { CartLine, OrderTotals } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { lineCap, type CouponResult } from "@/lib/pricing";
import type { CouponOffer } from "@/lib/quote";

export function CartLineItem({ line, onNavigate, compact }: { line: CartLine; onNavigate?: () => void; compact?: boolean }) {
  const max = lineCap(line.maxQuantity, line.maxPerOrder);
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

/** Apply a code from the bag: the shop's listed offers as chips, the full list as you tap or type. */
export function CouponForm({
  coupon,
  code,
  offers = [],
}: {
  coupon: CouponResult | null;
  code: string | null;
  /** The shop's listed coupons, already checked against this bag (applicable ones first). */
  offers?: CouponOffer[];
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Close the list on a tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const apply = (next: string) => {
    const clean = next.trim().toUpperCase();
    if (!clean) return;
    couponStore.set(clean);
    setValue("");
    setOpen(false);
  };

  if (code) {
    const applied = offers.find((o) => o.code === code);
    return (
      <div className="flex items-start justify-between gap-3 rounded-control border border-dashed border-line-strong bg-raised px-4 py-3 text-sm">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 font-medium">
            <Tag className="size-3.5" />
            {code}
          </p>
          {coupon && !coupon.ok ? (
            <p className="mt-1 text-[0.8rem] text-danger">{coupon.reason}</p>
          ) : (
            applied?.saving !== undefined && <p className="mt-0.5 text-[0.8rem] text-success">You save {formatPrice(applied.saving)}</p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 text-[0.72rem] uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-ink"
          onClick={() => couponStore.set(null)}
        >
          Remove
        </button>
      </div>
    );
  }

  const query = value.trim().toUpperCase();
  const shown = query ? offers.filter((o) => o.code.includes(query)) : offers;
  const chips = offers.filter((o) => o.applies).slice(0, 3);

  return (
    <div
      ref={boxRef}
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation(); // close the list, not the drawer
          setOpen(false);
        }
      }}
    >
      {offers.length > 0 && (
        <ul aria-label="Offers for your bag" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {chips.map((o) => (
            <li key={o.code} className="shrink-0">
              <button
                type="button"
                onClick={() => apply(o.code)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-brand/60 bg-brand/5 px-3 text-[0.75rem] text-brand transition-colors hover:border-brand hover:bg-brand/10"
              >
                <Tag className="size-3" />
                <span className="font-medium">{o.code}</span>
                <span className="text-brand/80">· Save {formatPrice(o.saving ?? 0)}</span>
              </button>
            </li>
          ))}
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={listId}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong px-3 text-[0.75rem] text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {chips.length ? "All offers" : `${offers.length} offer${offers.length > 1 ? "s" : ""} available`}
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          </li>
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(value);
        }}
      >
        <label htmlFor="coupon" className="sr-only">
          Discount code
        </label>
        <input
          id="coupon"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Discount code"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-raised px-4 text-sm uppercase placeholder:normal-case focus:border-ink focus:outline-none"
        />
        <Button type="submit" variant="outline" size="sm" className="h-11" disabled={!value.trim()}>
          Apply
        </Button>
      </form>

      {open && (
        <div
          id={listId}
          className="overflow-hidden rounded-control border border-line bg-raised shadow-[0_12px_30px_-18px_rgb(36_32_32/0.35)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
              {query ? `Matching “${query}”` : "Available offers"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offers"
              className="-mr-1.5 grid size-7 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="px-4 py-4 text-[0.82rem] text-muted">
              {query ? <>No listed offer matches — press Apply to try “{query}”.</> : "No offers right now. Have a code? Type it above."}
            </p>
          ) : (
            <ul className="max-h-[min(16rem,38dvh)] divide-y divide-line overflow-y-auto overscroll-contain">
              {shown.map((o) => (
                <li key={o.code} className={cn("flex items-start gap-3 px-4 py-3", !o.applies && "bg-surface/40")}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-chip border border-dashed px-2 py-0.5 text-[0.72rem] font-medium tracking-[0.08em]",
                          o.applies ? "border-brand/60 text-brand" : "border-line-strong text-muted",
                        )}
                      >
                        {o.code}
                      </span>
                      <span className="text-[0.88rem] font-medium">{o.headline}</span>
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">{o.details}</p>
                    {o.applies ? (
                      <p className="mt-1 text-[0.78rem] font-medium text-success">Save {formatPrice(o.saving ?? 0)} on this bag</p>
                    ) : (
                      o.reason && <p className="mt-1 text-[0.75rem] text-muted">{o.reason}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={o.applies ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 shrink-0 px-3"
                    disabled={!o.applies}
                    onClick={() => apply(o.code)}
                  >
                    Apply
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function TotalsTable({
  totals,
  shippingLabel = "Shipping",
  showTotal = true,
}: {
  totals: OrderTotals;
  shippingLabel?: string;
  /** Off where the total sits next to the checkout button instead. */
  showTotal?: boolean;
}) {
  const threshold = useStoreSettings().shipping.freeShippingThreshold;
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
      {showTotal && (
        <>
          <dl className="flex items-baseline justify-between border-t border-line pt-4">
            <dt className="font-medium">Total</dt>
            <dd className="font-serif text-[1.75rem] leading-none">{formatPrice(totals.total)}</dd>
          </dl>
          {storeSettings.pricesIncludeTax && <p className="text-[0.75rem] text-muted">Prices include applicable taxes.</p>}
        </>
      )}
    </div>
  );
}

/* ------------------------------ Kits in the bag ------------------------------ */

/** Single products and whole kits, in the order they were added. */
export function CartEntries({ lines, onNavigate, compact }: { lines: CartLine[]; onNavigate?: () => void; compact?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {groupCart(lines).map((entry) =>
        entry.type === "kit" ? (
          <CartKitItem key={entry.key} entry={entry} onNavigate={onNavigate} compact={compact} />
        ) : (
          <CartLineItem key={entry.key} line={entry.line} onNavigate={onNavigate} compact={compact} />
        ),
      )}
    </ul>
  );
}

/** Up to four item pictures in a 2×2 tile. */
export function KitMosaic({ lines, className }: { lines: CartLine[]; className?: string }) {
  return (
    <span className={cn("grid aspect-[4/5] shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-chip bg-line", className)}>
      {lines.slice(0, 4).map((l) => (
        <span key={l.key} className="relative bg-surface">
          <Image src={l.image.src} alt="" fill sizes="56px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

function CartKitItem({
  entry,
  onNavigate,
  compact,
}: {
  entry: Extract<CartEntry, { type: "kit" }>;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { bundle, lines, total } = entry;
  const editHref = `/kit?edit=${encodeURIComponent(bundle.id)}`;
  return (
    <li className="py-5">
      <div className="flex gap-4 sm:gap-5">
        <Link href={editHref} onClick={onNavigate} aria-label={`Edit ${bundle.name}`} className="shrink-0">
          <KitMosaic lines={lines} className={compact ? "w-20" : "w-24 sm:w-28"} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-accent-ink">Kit · {lines.length} items</p>
              <Link href={editHref} onClick={onNavigate} className="mt-0.5 block font-serif text-[1.2rem] leading-tight hover:text-brand">
                {bundle.name}
              </Link>
              <p className="mt-1 text-[0.8rem] text-muted">{bundle.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                removeKitFromCart(bundle.id);
                toast(`${bundle.name} removed from your bag`, {
                  action: { label: "Undo", onClick: () => putKitInCart(bundle, lines) },
                });
              }}
              aria-label={`Remove ${bundle.name}`}
              className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
            <Link
              href={editHref}
              onClick={onNavigate}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.72rem] font-medium uppercase tracking-[0.1em] hover:border-ink"
            >
              <Pencil className="size-3.5" /> Edit kit
            </Link>
            <p className="text-[0.95rem] font-medium tabular-nums">{formatPrice(total)}</p>
          </div>
        </div>
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[0.8rem] text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">View {lines.length} items</span>
          <span className="hidden group-open:inline">Hide items</span>
        </summary>
        <ul className="mt-2 space-y-1.5 rounded-control bg-surface/60 p-3 text-[0.8rem]">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                {l.name}
                {l.variantLabel && <span className="text-muted"> · {l.variantLabel}</span>}
                <span className="text-muted"> × {l.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
