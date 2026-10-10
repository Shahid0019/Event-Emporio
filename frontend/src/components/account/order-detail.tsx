import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { fulfilmentSteps, orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/utils";

export function statusTone(status: OrderStatus) {
  if (status === "delivered") return "success" as const;
  if (status === "cancelled" || status === "refunded") return "danger" as const;
  if (status === "pending") return "muted" as const;
  return "accent" as const;
}

export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <p className="rounded-control border-l-2 border-danger bg-danger/5 px-4 py-3 text-[0.9rem]">
        This order was {order.status}. {order.paymentStatus === "refunded" && "Your refund has been issued to the original payment method."}
      </p>
    );
  }
  const reached = fulfilmentSteps.indexOf(order.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {fulfilmentSteps.map((step, i) => {
        const done = i <= reached;
        const event = order.history.find((h) => h.status === step);
        return (
          <li key={step} className="relative" aria-current={i === reached ? "step" : undefined}>
            <span className={cn("block h-0.5 w-full", done ? "bg-brand" : "bg-line")} />
            <span
              className={cn(
                "mt-3 flex items-center gap-1.5 text-[0.75rem] font-medium uppercase tracking-[0.1em] sm:text-[0.8rem]",
                done ? "text-ink" : "text-muted",
              )}
            >
              {done && <Check className="hidden size-3.5 text-brand sm:block" />}
              {orderStatusLabel[step]}
            </span>
            {event && <span className="mt-0.5 block text-[0.72rem] text-muted">{formatDate(event.at)}</span>}
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
        <Badge tone={order.paymentStatus === "paid" ? "success" : "muted"}>{paymentStatusLabel[order.paymentStatus]}</Badge>
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
