"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Truck } from "lucide-react";
import { OrderTimeline, statusTone } from "@/components/account/order-detail";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { canTransition, nextStatuses, orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { AdminHeader, ConfirmAction, DataTable, downloadCsv, Panel, type Column } from "./admin-ui";

const filters: { value: string; label: string; match: (o: Order) => boolean }[] = [
  { value: "all", label: "All orders", match: () => true },
  { value: "open", label: "Open", match: (o) => ["pending", "confirmed", "processing"].includes(o.status) },
  { value: "shipped", label: "Shipped", match: (o) => o.status === "shipped" },
  { value: "delivered", label: "Delivered", match: (o) => o.status === "delivered" },
  { value: "closed", label: "Cancelled / refunded", match: (o) => o.status === "cancelled" || o.status === "refunded" },
];

export function OrdersAdmin() {
  const { orders } = adminStore.useStore();
  const [filter, setFilter] = useState("all");
  const rows = orders.filter(filters.find((f) => f.value === filter)!.match);

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Order",
      sortValue: (o) => o.number,
      cell: (o) => (
        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-brand">
          {o.number}
        </Link>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortValue: (o) => o.createdAt,
      cell: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (o) => o.customer.name,
      cell: (o) => (
        <span>
          {o.customer.name}
          <span className="block text-[0.78rem] text-muted">{o.shippingAddress.city}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Fulfilment",
      sortValue: (o) => o.status,
      cell: (o) => <Badge tone={statusTone(o.status)}>{orderStatusLabel[o.status]}</Badge>,
    },
    {
      key: "payment",
      header: "Payment",
      sortValue: (o) => o.paymentStatus,
      cell: (o) => (
        <Badge tone={o.paymentStatus === "paid" ? "success" : o.paymentStatus === "failed" ? "danger" : "muted"}>
          {paymentStatusLabel[o.paymentStatus]}
        </Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortValue: (o) => o.totals.total,
      className: "text-right",
      cell: (o) => <span className="tabular-nums">{formatPrice(o.totals.total)}</span>,
    },
  ];

  return (
    <>
      <AdminHeader
        title="Orders"
        description={`${orders.length} orders`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv("orders.csv", [
                ["Order", "Date", "Customer", "Email", "City", "Status", "Payment", "Subtotal", "Discount", "Shipping", "Total"],
                ...rows.map((o) => [
                  o.number,
                  o.createdAt,
                  o.customer.name,
                  o.customer.email,
                  o.shippingAddress.city,
                  o.status,
                  o.paymentStatus,
                  o.totals.subtotal / 100,
                  o.totals.discount / 100,
                  o.totals.shipping / 100,
                  o.totals.total / 100,
                ]),
              ])
            }
          >
            <Download /> Export CSV
          </Button>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        searchText={(o) => `${o.number} ${o.customer.name} ${o.customer.email} ${o.customer.phone}`}
        searchPlaceholder="Search order, name, email or phone"
        initialSort={{ key: "date", dir: "desc" }}
        toolbar={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter orders">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-9 rounded-full border px-3.5 text-[0.8rem] transition-colors ${filter === f.value ? "border-ink bg-ink text-canvas" : "border-line-strong hover:border-ink"}`}
              >
                {f.label} <span className="opacity-60">({orders.filter(f.match).length})</span>
              </button>
            ))}
          </div>
        }
      />
    </>
  );
}

export function OrderAdminDetail({ id }: { id: string }) {
  const order = adminStore.useStore((s) => s.orders.find((o) => o.id === id));
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        action={
          <Link href="/admin/orders" className={buttonVariants()}>
            Back to orders
          </Link>
        }
      />
    );
  }

  const transition = (to: OrderStatus, extra?: Partial<Order>, eventNote?: string) => {
    if (!canTransition(order.status, to, order.paymentStatus)) {
      toast.error(`Can't move an order from ${orderStatusLabel[order.status]} to ${orderStatusLabel[to]}`);
      return;
    }
    updateAdmin((d) => {
      const o = d.orders.find((x) => x.id === order.id)!;
      Object.assign(o, extra);
      o.status = to;
      o.history.push({ status: to, at: new Date().toISOString(), note: eventNote || note || undefined });
      // Cancelling returns reserved stock to inventory.
      if (to === "cancelled") {
        for (const l of o.lines) {
          const v = d.products.flatMap((p) => p.variants).find((x) => x.id === l.variantId);
          if (v) v.stock += l.quantity;
        }
      }
    });
    setNote("");
    toast.success(`Order marked ${orderStatusLabel[to].toLowerCase()}`, {
      description: "Customer notification will be sent once email is connected.",
    });
  };

  const a = order.shippingAddress;
  const options = nextStatuses(order.status).filter((s) => canTransition(order.status, s, order.paymentStatus));

  return (
    <>
      <AdminHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={
          <>
            <Badge tone={statusTone(order.status)}>{orderStatusLabel[order.status]}</Badge>
            <Badge tone={order.paymentStatus === "paid" ? "success" : "muted"}>{paymentStatusLabel[order.paymentStatus]}</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Progress">
            <OrderTimeline order={order} />
            {order.tracking && (
              <p className="mt-5 text-[0.88rem]">
                <Truck className="mr-2 inline size-4" />
                {order.tracking.carrier} · {order.tracking.number}
              </p>
            )}
          </Panel>

          <Panel title={`Items (${order.lines.length})`} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {order.lines.map((l) => (
                <li key={l.variantId} className="flex items-center gap-4 px-5 py-4">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-surface">
                    <Image src={l.image.src} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1 text-[0.88rem]">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-muted">
                      {l.variantLabel || "Default"} · {l.quantity} × {formatPrice(l.unitPrice)}
                    </p>
                    {l.giftMessage && <p className="text-[0.8rem] italic text-muted">Gift note: “{l.giftMessage}”</p>}
                  </div>
                  <p className="tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line px-5 py-4 text-[0.88rem]">
              <Row label="Subtotal" value={formatPrice(order.totals.subtotal)} />
              {order.totals.discount > 0 && (
                <Row
                  label={`Discount ${order.couponCode ? `(${order.couponCode})` : ""}`}
                  value={`−${formatPrice(order.totals.discount)}`}
                />
              )}
              <Row label={order.shippingMethod} value={order.totals.shipping ? formatPrice(order.totals.shipping) : "Free"} />
              <Row label="Total" value={formatPrice(order.totals.total)} strong />
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="space-y-3 text-[0.86rem]">
              {[...order.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                  <span>
                    <span className="font-medium">{orderStatusLabel[h.status]}</span> ·{" "}
                    <span className="text-muted">{formatDateTime(h.at)}</span>
                    {h.note && <span className="block text-muted">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update fulfilment">
            {options.length === 0 ? (
              <p className="text-[0.88rem] text-muted">This order is closed — no further status changes.</p>
            ) : (
              <div className="space-y-4">
                <Field label="Internal note" htmlFor="order-note" optional>
                  <Textarea id="order-note" rows={2} className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="grid gap-2">
                  {options.map((s) =>
                    s === "shipped" ? (
                      <Button key={s} onClick={() => setShipOpen(true)}>
                        <Truck /> Mark shipped
                      </Button>
                    ) : s === "cancelled" || s === "refunded" ? (
                      <ConfirmAction
                        key={s}
                        trigger={
                          <Button variant="outline" className="text-danger">
                            {s === "cancelled" ? "Cancel order" : "Refund order"}
                          </Button>
                        }
                        title={s === "cancelled" ? "Cancel this order?" : "Refund this order?"}
                        description={
                          s === "cancelled"
                            ? "Reserved stock goes back into inventory. If the order was paid, issue the refund afterwards."
                            : `A full refund of ${formatPrice(order.totals.total)} will be requested from Razorpay (simulated in demo mode).`
                        }
                        confirmLabel={s === "cancelled" ? "Cancel order" : "Issue refund"}
                        destructive
                        onConfirm={() => transition(s, s === "refunded" ? { paymentStatus: "refunded" } : undefined)}
                      />
                    ) : (
                      <Button key={s} variant={s === "delivered" ? "primary" : "secondary"} onClick={() => transition(s)}>
                        Mark {orderStatusLabel[s].toLowerCase()}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Customer">
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-[0.86rem] text-muted">{order.customer.email}</p>
            <p className="text-[0.86rem] text-muted">{order.customer.phone}</p>
          </Panel>

          <Panel title="Delivery address">
            <address className="text-[0.88rem] not-italic leading-relaxed">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 && <>, {a.line2}</>}
              <br />
              {a.city}, {a.state} {a.pincode}
            </address>
            {order.deliveryInstructions && <p className="mt-3 text-[0.82rem] text-muted">“{order.deliveryInstructions}”</p>}
          </Panel>

          <Panel title="Payment">
            <p className="text-[0.88rem]">Razorpay · {paymentStatusLabel[order.paymentStatus]}</p>
            {order.paymentReference && <p className="mt-1 break-all text-[0.8rem] text-muted">{order.paymentReference}</p>}
          </Panel>
        </div>
      </div>

      <Sheet
        open={shipOpen}
        onOpenChange={setShipOpen}
        title="Mark as shipped"
        description="Add tracking so the customer can follow the parcel."
        side="center"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!carrier.trim() || !tracking.trim()) {
              toast.error("Carrier and tracking number are required");
              return;
            }
            transition("shipped", { tracking: { carrier: carrier.trim(), number: tracking.trim() } }, `Shipped via ${carrier.trim()}`);
            setShipOpen(false);
          }}
        >
          <Field label="Courier" htmlFor="carrier">
            <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Delhivery" />
          </Field>
          <Field label="Tracking number" htmlFor="tracking">
            <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full">
            Confirm shipment
          </Button>
        </form>
      </Sheet>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-line pt-2 font-medium" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
