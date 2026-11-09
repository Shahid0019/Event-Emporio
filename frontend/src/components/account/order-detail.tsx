import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Check, ClipboardCheck, House, PackageOpen, Truck, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { cashDue, fulfilmentSteps, orderStatusLabel, paymentLabel } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

/** Customer wording for each stage (handbook screen 10). */
const stageLabel: Partial<Record<OrderStatus, string>> = {
  confirmed: "Order confirmed",
  processing: "Preparing your order",
  shipped: "Out for delivery",
  delivered: "Delivered",
};
const stageShort: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "On the way",
  delivered: "Delivered",
};
const stageNote: Partial<Record<OrderStatus, string>> = {
  confirmed: "We've checked stock and accepted your order.",
  processing: "Your supplies are being picked and packed.",
  shipped: "Everything is on its way to you, in one delivery.",
  delivered: "Delivered. We hope your function goes beautifully.",
};

export function statusTone(status: OrderStatus) {
  if (status === "delivered") return "success" as const;
  if (status === "cancelled" || status === "refunded") return "danger" as const;
  if (status === "pending") return "muted" as const;
  return "accent" as const;
}

/** One icon per stage, so progress reads at a glance. */
const stageIcon: Partial<Record<OrderStatus, LucideIcon>> = {
  confirmed: BadgeCheck,
  processing: PackageOpen,
  shipped: Truck,
  delivered: House,
};

/**
 * Order progress. `vertical` (default): every stage with its time and a note on
 * the current one. `steps`: a compact row of icons for the order-received page.
 */
export function OrderTimeline({ order, layout = "vertical" }: { order: Order; layout?: "vertical" | "steps" }) {
  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <p className="rounded-control border-l-2 border-danger bg-danger/5 px-4 py-3 text-[0.9rem]">
        This order was {order.status}. {order.paymentStatus === "refunded" && "Your refund has been issued to the original payment method."}
      </p>
    );
  }
  // Handbook screen 10: five stages, only completed ones ticked, each with its real time.
  const reached = fulfilmentSteps.indexOf(order.status);
  const stages = [
    {
      label: "Order received",
      short: "Received",
      icon: ClipboardCheck,
      note: "We've received your order.",
      done: true,
      at: order.createdAt,
    },
    ...fulfilmentSteps.map((step, i) => ({
      label: stageLabel[step] ?? orderStatusLabel[step],
      short: stageShort[step] ?? orderStatusLabel[step],
      icon: stageIcon[step] ?? Check,
      note: stageNote[step] ?? "",
      done: i <= reached,
      at: order.history.find((h) => h.status === step)?.at,
    })),
  ];
  const current = stages.findLastIndex((s) => s.done);

  if (layout === "steps")
    return (
      <ol className="grid grid-cols-5" aria-label="Order progress">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className="relative flex flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
              {/* The joining line runs from this stage to the next. */}
              {i < stages.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute left-1/2 top-5 h-0.5 w-full", stages[i + 1].done ? "bg-brand" : "bg-line-strong")}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative grid size-10 place-items-center rounded-full border-2 transition-colors",
                  s.done ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-raised text-muted",
                  i === current && "ring-4 ring-brand/15",
                )}
              >
                <Icon className="size-[1.1rem]" />
              </span>
              <span
                className={cn("mt-2 px-0.5 text-[0.7rem] font-medium leading-tight sm:text-[0.8rem]", s.done ? "text-ink" : "text-muted")}
              >
                {s.short}
              </span>
              <span className="sr-only">{s.done ? (i === current ? "current step" : "done") : "not yet"}</span>
            </li>
          );
        })}
      </ol>
    );

  return (
    <ol className="rounded-card border border-line bg-raised px-4 py-2 sm:px-5" aria-label="Order progress">
      {stages.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.label} className="relative flex gap-3.5 py-2.5" aria-current={i === current ? "step" : undefined}>
            {i < stages.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute left-[1.1875rem] top-12 h-[calc(100%-2.5rem)] w-0.5", stages[i + 1].done ? "bg-brand" : "bg-line")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-full border-2",
                s.done ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-raised text-muted",
                i === current && "ring-4 ring-brand/15",
              )}
            >
              <Icon className="size-[1.1rem]" />
            </span>
            <span className="min-w-0 pt-1.5">
              <span className={cn("block font-serif text-[1.1rem] leading-tight", s.done ? "text-ink" : "text-muted")}>{s.label}</span>
              {i === current && s.note && <span className="mt-0.5 block text-[0.82rem] text-muted">{s.note}</span>}
              {s.done && s.at && <span className="mt-0.5 block text-[0.75rem] text-muted">{formatDateTime(s.at)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetail({ order }: { order: Order }) {
  const a = order.shippingAddress;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(order.status)}>{orderStatusLabel[order.status]}</Badge>
        <Badge tone={order.paymentStatus === "paid" ? "success" : cashDue(order) ? "accent" : "muted"}>{paymentLabel(order)}</Badge>
        <span className="text-[0.85rem] text-muted">Placed {formatDateTime(order.createdAt)}</span>
      </div>

      <OrderTimeline order={order} />

      {order.tracking && (
        <p className="text-[0.9rem]">
          Shipped with {order.tracking.carrier} · Tracking number <span className="font-medium">{order.tracking.number}</span>
          {order.tracking.url && (
            <>
              {" "}
              ·{" "}
              <a href={order.tracking.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Track shipment
              </a>
            </>
          )}
        </p>
      )}

      <div className="grid gap-10 md:grid-cols-[1fr_18rem]">
        <ul className="divide-y divide-line border-y border-line">
          {order.lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 py-5">
              <Link href={`/products/${l.slug}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-control bg-surface">
                <Image src={l.image.src} alt={l.image.alt} fill sizes="80px" className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${l.slug}`} className="font-serif text-xl leading-tight hover:text-brand">
                  {l.name}
                </Link>
                {l.variantLabel && <p className="text-[0.82rem] text-muted">{l.variantLabel}</p>}
                {l.giftMessage && <p className="mt-1 text-[0.82rem] italic text-muted">Gift note: “{l.giftMessage}”</p>}
                <p className="mt-1 text-[0.82rem] text-muted">
                  {l.quantity} × {formatPrice(l.unitPrice)}
                </p>
              </div>
              <p className="text-[0.92rem]">{formatPrice(l.unitPrice * l.quantity)}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-8 text-[0.9rem]">
          <dl className="space-y-2.5">
            <Row label="Subtotal" value={formatPrice(order.totals.subtotal)} />
            {order.totals.discount > 0 && (
              <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`−${formatPrice(order.totals.discount)}`} />
            )}
            <Row label={order.shippingMethod} value={order.totals.shipping ? formatPrice(order.totals.shipping) : "Free"} />
            <div className="flex justify-between border-t border-line pt-3 font-medium">
              <dt>Total</dt>
              <dd>{formatPrice(order.totals.total)}</dd>
            </div>
          </dl>
          <div>
            <h3 className="eyebrow mb-3 text-accent-ink">Delivering to</h3>
            <address className="not-italic leading-relaxed text-muted">
              <span className="text-ink">{a.fullName}</span>
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </address>
          </div>
          <div>
            <h3 className="eyebrow mb-3 text-accent-ink">Payment</h3>
            <p className="text-muted">
              {order.paymentMethod === "razorpay" ? "Razorpay" : "Cash on delivery"}
              {cashDue(order) && (
                <span className="block text-[0.85rem]">Pay {formatPrice(order.totals.total)} when it&apos;s delivered</span>
              )}
              {order.paymentReference && <span className="block break-all text-[0.78rem]">Ref. {order.paymentReference}</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
