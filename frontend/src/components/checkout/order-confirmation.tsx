"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Copy,
  CreditCard,
  Headphones,
  MapPin,
  PackageCheck,
  PhoneCall,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { OrderTimeline } from "@/components/account/order-detail";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/kit/format";
import { sessionStore } from "@/lib/store";
import type { Order, OrderLine } from "@/lib/types";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

type Group = { key: string; kit?: { name: string; summary: string }; lines: OrderLine[]; total: number };

/** Kit items stay together as one row, like in the bag; other products are their own rows. */
function groupLines(lines: OrderLine[]): Group[] {
  const groups: Group[] = [];
  const kits = new Map<string, Group>();
  for (const l of lines) {
    const amount = l.unitPrice * l.quantity;
    if (!l.bundle) {
      groups.push({ key: l.variantId, lines: [l], total: amount });
      continue;
    }
    let g = kits.get(l.bundle.id);
    if (!g) {
      g = { key: l.bundle.id, kit: { name: l.bundle.name, summary: l.bundle.summary }, lines: [], total: 0 };
      kits.set(l.bundle.id, g);
      groups.push(g);
    }
    g.lines.push(l);
    g.total += amount;
  }
  return groups;
}

const card = "rounded-card border border-line bg-raised p-5 sm:p-6";
const cardTitle = "flex items-center gap-2 font-sans text-[1rem] font-semibold tracking-normal";

/**
 * Order received (handbook screen 09): the order is in, but not yet accepted
 * for delivery. Shows the order number, true payment state and progress, what
 * happens next, and the full summary — with tracking one tap away.
 */
export function OrderConfirmation({ order }: { order: Order | null }) {
  const user = sessionStore.useStore();

  if (!order) {
    return (
      <EmptyState
        title="We couldn't find that order"
        description="If you've just placed an order, check your confirmation email or look it up with your order number."
        action={
          <Link href="/track-order" className={buttonVariants()}>
            Track an order
          </Link>
        }
      />
    );
  }

  const paid = order.paymentStatus === "paid";
  const cod = order.paymentMethod === "cod" && order.status !== "pending";
  const trackHref = user
    ? `/account/orders/${order.id}`
    : `/track-order?order=${encodeURIComponent(order.number)}&email=${encodeURIComponent(order.customer.email)}`;
  const a = order.shippingAddress;
  const groups = groupLines(order.lines);

  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: PhoneCall, title: "We confirm your order", text: "We check stock and call you if anything needs a decision." },
    { icon: PackageCheck, title: "We pack everything", text: "All your functions and items are packed together." },
    {
      icon: Truck,
      title: "One delivery",
      text: order.firstFunctionDate
        ? `Planned ahead of your first function on ${formatEventDate(order.firstFunctionDate)}.`
        : "Ahead of your first function — we'll agree the day with you.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Hero */}
      <header className="pb-3 text-center">
        <span className="relative mx-auto grid size-20 place-items-center">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/15 [animation-iteration-count:2]" />
          <span className="relative grid size-20 place-items-center rounded-full bg-brand text-brand-ink shadow-[0_14px_34px_-12px_rgb(66_94_42/0.6)]">
            <Check className="size-10" strokeWidth={2.5} />
          </span>
        </span>
        <h1 className="mt-6 text-[2.4rem] leading-tight sm:text-[3.2rem]">Order received!</h1>
        <p className="mx-auto mt-3 max-w-md text-[1rem] leading-relaxed text-muted">
          Thank you, <span className="text-ink">{order.customer.name.split(" ")[0]}</span>. We&apos;ve got your order and will keep you
          updated at <span className="break-all text-ink">{order.customer.email}</span>.
        </p>
      </header>

      {/* Order number */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-5 py-4">
        <div>
          <p className="text-[0.8rem] text-muted">Order number</p>
          <p className="font-serif text-[1.7rem] leading-tight tracking-wide">#{order.number}</p>
          <p className="text-[0.78rem] text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <CopyButton value={order.number} />
      </div>

      {/* Progress */}
      <section aria-labelledby="track-title" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="track-title" className={cardTitle}>
            <Truck aria-hidden className="size-[1.1rem] text-accent-ink" /> Track your order
          </h2>
          <PaymentChip paid={paid} cod={cod} total={order.totals.total} />
        </div>
        <div className="mt-6">
          <OrderTimeline order={order} layout="steps" />
        </div>
        <Link href={trackHref} className={buttonVariants({ size: "lg", className: "mt-6 w-full normal-case tracking-normal text-[0.95rem]" })}>
          Track my order <ArrowRight aria-hidden />
        </Link>
      </section>

      {/* What happens next */}
      <section aria-labelledby="next-title" className={card}>
        <h2 id="next-title" className={cardTitle}>
          What happens next
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-3 sm:flex-col">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-control bg-surface text-accent-ink">
                <Icon aria-hidden className="size-5" />
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand text-[0.68rem] font-semibold text-brand-ink">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-[0.85rem] leading-snug text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Summary */}
      <section aria-labelledby="summary-title" className={card}>
        <h2 id="summary-title" className={cardTitle}>
          Your order
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {groups.map((g) => (g.kit ? <KitRow key={g.key} group={g} /> : <ItemRow key={g.key} line={g.lines[0]} />))}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-line pt-4 text-[0.92rem]">
          <Row label="Subtotal" value={formatPrice(order.totals.subtotal)} />
          {order.totals.discount > 0 && (
            <Row
              label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
              value={`−${formatPrice(order.totals.discount)}`}
              className="text-success"
            />
          )}
          <Row label="Delivery" value={order.totals.shipping ? formatPrice(order.totals.shipping) : "Free"} />
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-medium">Total {paid ? "paid" : ""}</dt>
            <dd className="font-serif text-[1.6rem] tabular-nums">{formatPrice(order.totals.total)}</dd>
          </div>
        </dl>
      </section>

      {/* Delivery + payment */}
      <div className="grid gap-5 sm:grid-cols-2">
        <section aria-labelledby="deliver-title" className={card}>
          <h2 id="deliver-title" className={cardTitle}>
            <MapPin aria-hidden className="size-[1.1rem] text-accent-ink" /> Delivering to
          </h2>
          <address className="mt-3 text-[0.92rem] not-italic leading-relaxed text-muted">
            <span className="font-medium text-ink">{a.fullName}</span>
            <br />
            {a.line1}
            {a.line2 && <>, {a.line2}</>}
            <br />
            {a.city}, {a.state} – {a.pincode}
            <br />
            {a.phone}
          </address>
          {order.firstFunctionDate && (
            <p className="mt-3 text-[0.85rem]">
              <span className="text-muted">First function:</span> <span className="font-medium">{formatEventDate(order.firstFunctionDate, "long")}</span>
            </p>
          )}
        </section>
        <section aria-labelledby="pay-title" className={card}>
          <h2 id="pay-title" className={cardTitle}>
            {order.paymentMethod === "cod" ? (
              <Banknote aria-hidden className="size-[1.1rem] text-accent-ink" />
            ) : (
              <CreditCard aria-hidden className="size-[1.1rem] text-accent-ink" />
            )}
            Payment
          </h2>
          <p className="mt-3 text-[0.92rem]">{order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online (Razorpay)"}</p>
          <p className="mt-1 text-[0.85rem] text-muted">
            {cod
              ? `Please keep ${formatPrice(order.totals.total)} ready in cash when your order arrives.`
              : paid
                ? "Your payment is confirmed."
                : "We're confirming your payment — this page updates in a moment."}
          </p>
          {order.paymentReference && <p className="mt-2 break-all text-[0.75rem] text-muted">Ref. {order.paymentReference}</p>}
        </section>
      </div>

      {/* Help + more */}
      <Link
        href="/contact"
        className="flex min-h-16 items-center justify-between gap-3 rounded-card border border-line bg-raised px-5 transition-colors hover:border-ink"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-control bg-surface text-accent-ink">
            <Headphones aria-hidden className="size-5" />
          </span>
          <span>
            <span className="block font-medium">Need help with this order?</span>
            <span className="block text-[0.82rem] text-muted">Quote #{order.number} and we&apos;ll sort it out.</span>
          </span>
        </span>
        <ArrowRight aria-hidden className="size-4 text-muted" />
      </Link>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-[0.9rem] font-medium">
        <Link href="/shop" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Continue shopping
        </Link>
        {!user && (
          <Link href="/register" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Create an account to see all your orders
          </Link>
        )}
      </div>
    </div>
  );
}

function PaymentChip({ paid, cod, total }: { paid: boolean; cod: boolean; total: number }) {
  if (paid)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-chip bg-success/10 px-2.5 py-1 text-[0.8rem] font-medium text-success">
        <CircleCheck aria-hidden className="size-4" /> Payment successful
      </span>
    );
  if (cod)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-chip bg-accent-soft px-2.5 py-1 text-[0.8rem] font-medium text-accent-ink">
        <Banknote aria-hidden className="size-4" /> Pay {formatPrice(total)} on delivery
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface px-2.5 py-1 text-[0.8rem] font-medium text-muted">
      <Clock aria-hidden className="size-4" /> Confirming payment
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Order number copied");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast("Couldn't copy — please note it down", { description: value });
        }
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-strong bg-raised px-4 text-[0.85rem] font-medium transition-colors hover:border-ink"
    >
      {copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function KitRow({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  const pieces = group.lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <li className="py-3.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3.5 text-left">
        <span aria-hidden className="grid size-14 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-control bg-surface">
          {group.lines.slice(0, 4).map((l) => (
            <span key={l.variantId} className="relative block bg-surface">
              <Image src={l.image.src} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{group.kit!.name}</span>
          <span className="block truncate text-[0.8rem] text-muted">
            {group.lines.length} items · {pieces} pcs
          </span>
        </span>
        <span className="shrink-0 tabular-nums">{formatPrice(group.total)}</span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5 rounded-control bg-surface/70 p-3 text-[0.82rem]">
          {group.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span className="min-w-0">
                {l.name}
                {l.variantLabel && <span className="text-muted"> · {l.variantLabel}</span>}
                <span className="text-muted"> × {l.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ItemRow({ line }: { line: OrderLine }) {
  return (
    <li className="flex items-center gap-3.5 py-3.5">
      <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-surface">
        <Image src={line.image.src} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{line.name}</span>
        <span className="block truncate text-[0.8rem] text-muted">
          {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
        </span>
        {line.giftMessage && <span className="block truncate text-[0.78rem] italic text-muted">Gift note: “{line.giftMessage}”</span>}
      </span>
      <span className="shrink-0 tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</span>
    </li>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className={className ? undefined : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
