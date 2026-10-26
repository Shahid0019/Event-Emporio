"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Printer, Puzzle, StickyNote, Truck } from "lucide-react";
import { refundOrder } from "@/app/admin/actions";
import { OrderTimeline, statusTone } from "@/components/account/order-detail";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { canTransition, cashDue, nextStatuses, orderStatusLabel, paymentLabel } from "@/lib/order-status";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Order, OrderKind, OrderLine, OrderStatus } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { AdminHeader, ConfirmAction, DataTable, downloadCsv, Panel, type Column } from "./admin-ui";

/* ------------------------------- Kinds ---------------------------------- */

const KINDS: { value: OrderKind | "all"; label: string; description: string }[] = [
  { value: "all", label: "All orders", description: "Everything customers have paid for." },
  { value: "regular", label: "Product orders", description: "Orders with everyday products (baskets, hampers, gifts…)." },
  { value: "built-kit", label: "Built kit orders", description: "Kits the customer made or changed in the kit builder." },
];

const kindsOf = (o: Order): OrderKind[] => o.kinds ?? ["regular"];

export function KindBadges({ order }: { order: Order }) {
  return (
    <span className="flex flex-wrap gap-1">
      {kindsOf(order).map((k) =>
        k === "regular" ? null : (
          <Badge key={k} tone="brand" className="gap-1">
            <Puzzle className="size-3" /> Built kit
          </Badge>
        ),
      )}
    </span>
  );
}

/** "Wazwan kit · 50 trami + 2 products" — what's in the order at a glance. */
function contents(o: Order) {
  const kits = [...new Map(o.lines.filter((l) => l.bundle).map((l) => [l.bundle!.id, l.bundle!.name])).values()];
  const singles = o.lines.filter((l) => !l.bundle).reduce((n, l) => n + l.quantity, 0);
  const parts = [...kits];
  if (singles) parts.push(`${singles} product${singles === 1 ? "" : "s"}`);
  return parts.join(" + ");
}

/* ------------------------------ Filters --------------------------------- */

const filters: { value: string; label: string; match: (o: Order) => boolean }[] = [
  { value: "pack", label: "Needs packing", match: (o) => o.status === "confirmed" || o.status === "processing" },
  { value: "shipped", label: "Shipped", match: (o) => o.status === "shipped" },
  { value: "delivered", label: "Delivered", match: (o) => o.status === "delivered" },
  { value: "closed", label: "Cancelled / refunded", match: (o) => o.status === "cancelled" || o.status === "refunded" },
  { value: "cash", label: "Cash to collect", match: cashDue },
  { value: "paid", label: "All placed", match: (o) => o.status !== "pending" },
  { value: "unpaid", label: "Unpaid checkouts", match: (o) => o.status === "pending" },
];

export function OrdersAdmin() {
  const { orders } = adminStore.useStore();
  const router = useRouter();
  const params = useSearchParams();
  const kind = (KINDS.find((k) => k.value === params.get("kind"))?.value ?? "all") as OrderKind | "all";
  const [filter, setFilter] = useState("pack");

  const ofKind = orders.filter((o) => kind === "all" || kindsOf(o).includes(kind));
  const active = filters.find((f) => f.value === filter)!;
  const rows = ofKind.filter(active.match);
  const current = KINDS.find((k) => k.value === kind)!;

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Order",
      sortValue: (o) => o.number,
      cell: (o) => (
        <Link href={`/admin/orders/${o.id}`} className="block hover:text-brand">
          <span className="block font-medium">{o.number}</span>
          <span className="mt-1 block">
            <KindBadges order={o} />
          </span>
        </Link>
      ),
    },
    {
      key: "date",
      header: "Placed",
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
    { key: "contents", header: "What", cell: (o) => <span className="text-[0.86rem]">{contents(o)}</span> },
    {
      key: "status",
      header: "Status",
      sortValue: (o) => o.status,
      cell: (o) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={statusTone(o.status)}>{orderStatusLabel[o.status]}</Badge>
          {o.paymentStatus !== "paid" && (
            <Badge tone={o.paymentStatus === "failed" ? "danger" : cashDue(o) ? "accent" : "muted"}>{paymentLabel(o)}</Badge>
          )}
        </span>
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
        title={current.label}
        description={current.description}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(`orders-${kind}.csv`, [
                ["Order", "Date", "Kind", "Customer", "Email", "Phone", "City", "Contents", "Status", "Payment", "Total"],
                ...rows.map((o) => [
                  o.number,
                  o.createdAt,
                  kindsOf(o).join(" + "),
                  o.customer.name,
                  o.customer.email,
                  o.customer.phone,
                  o.shippingAddress.city,
                  contents(o),
                  o.status,
                  o.paymentStatus,
                  o.totals.total / 100,
                ]),
              ])
            }
          >
            <Download /> Export
          </Button>
        }
      />

      <div role="tablist" aria-label="Order kind" className="mb-5 flex flex-wrap gap-2 border-b border-line">
        {KINDS.map((k) => {
          const selected = k.value === kind;
          const count = orders.filter((o) => (k.value === "all" || kindsOf(o).includes(k.value)) && filters[0].match(o)).length;
          return (
            <button
              key={k.value}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => router.replace(k.value === "all" ? "/admin/orders" : `/admin/orders?kind=${k.value}`, { scroll: false })}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-[0.9rem] transition-colors",
                selected ? "border-brand font-medium text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {k.label}
              {count > 0 && <span className="rounded-full bg-brand px-1.5 text-[0.68rem] font-medium text-brand-ink">{count} to pack</span>}
            </button>
          );
        })}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        searchText={(o) => `${o.number} ${o.customer.name} ${o.customer.email} ${o.customer.phone} ${contents(o)}`}
        searchPlaceholder="Search order number, name, email or phone"
        initialSort={{ key: "date", dir: "desc" }}
        empty={filter === "pack" ? "Nothing to pack right now." : "No orders here yet."}
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
                {f.label} <span className="opacity-60">({ofKind.filter(f.match).length})</span>
              </button>
            ))}
          </div>
        }
      />
      {filter === "unpaid" && (
        <p className="mt-3 text-[0.82rem] text-muted">
          Unpaid checkouts are orders where the customer started paying but didn&apos;t finish. Don&apos;t pack these — they become normal
          orders automatically if payment comes through.
        </p>
      )}
    </>
  );
}

/* ------------------------------- Detail --------------------------------- */

function groupLines(lines: OrderLine[]) {
  const kits = new Map<string, { bundle: NonNullable<OrderLine["bundle"]>; lines: OrderLine[] }>();
  const singles: OrderLine[] = [];
  for (const l of lines) {
    if (!l.bundle) singles.push(l);
    else {
      const g = kits.get(l.bundle.id) ?? { bundle: l.bundle, lines: [] };
      g.lines.push(l);
      kits.set(l.bundle.id, g);
    }
  }
  return { kits: [...kits.values()], singles };
}

export function OrderAdminDetail({ id }: { id: string }) {
  const order = adminStore.useStore((s) => s.orders.find((o) => o.id === id));
  const router = useRouter();
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState(order?.staffNote ?? "");

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

  const transition = async (to: OrderStatus, extra?: Partial<Order>, eventNote?: string) => {
    if (!canTransition(order.status, to, order.paymentStatus)) {
      toast.error(`Can't move an order from ${orderStatusLabel[order.status]} to ${orderStatusLabel[to]}`);
      return;
    }
    const saved = await updateAdmin((d) => {
      const o = d.orders.find((x) => x.id === order.id)!;
      Object.assign(o, extra);
      o.status = to;
      o.history.push({ status: to, at: new Date().toISOString(), note: eventNote || undefined });
      // Cash on delivery is collected when the order is handed over.
      if (to === "delivered" && cashDue(order)) {
        o.paymentStatus = "paid";
        o.history.push({ status: to, at: new Date().toISOString(), note: "Cash collected on delivery" });
      }
      // Cancelling a paid order, or a confirmed cash-on-delivery one, puts its stock back.
      if (to === "cancelled" && (order.paymentStatus === "paid" || cashDue(order))) {
        for (const l of o.lines) {
          const v = d.products.flatMap((p) => p.variants).find((x) => x.id === l.variantId);
          if (v) v.stock += l.quantity;
        }
      }
    });
    if (saved) toast.success(`Order ${orderStatusLabel[to].toLowerCase()}`, { description: "The customer is emailed about the change." });
  };

  const refund = async () => {
    const res = await refundOrder(order.id);
    if (!res.ok) {
      toast.error("Refund failed", { description: res.error });
      return;
    }
    toast.success("Order refunded", {
      description: res.manual
        ? "Recorded as refunded — pay the customer back from your bank or UPI."
        : "Razorpay is sending the money back.",
    });
    router.refresh();
  };

  const collectCash = async () => {
    const saved = await updateAdmin((d) => {
      const o = d.orders.find((x) => x.id === order.id)!;
      o.paymentStatus = "paid";
      o.history.push({ status: o.status, at: new Date().toISOString(), note: `Cash collected · ${formatPrice(o.totals.total)}` });
    });
    if (saved) toast.success("Cash collected", { description: `${formatPrice(order.totals.total)} recorded as paid.` });
  };

  const saveNote = async () => {
    if (await updateAdmin((d) => void (d.orders.find((x) => x.id === order.id)!.staffNote = note.trim() || undefined)))
      toast.success("Note saved");
  };

  const a = order.shippingAddress;
  const options = nextStatuses(order.status).filter((s) => canTransition(order.status, s, order.paymentStatus));
  const { kits, singles } = groupLines(order.lines);
  const unpaid = order.status === "pending";

  return (
    <>
      <AdminHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)} · ${order.customer.name}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={
          <>
            <KindBadges order={order} />
            <Badge tone={statusTone(order.status)}>{orderStatusLabel[order.status]}</Badge>
            <Badge
              tone={
                order.paymentStatus === "paid"
                  ? "success"
                  : order.paymentStatus === "failed"
                    ? "danger"
                    : cashDue(order)
                      ? "accent"
                      : "muted"
              }
            >
              {paymentLabel(order)}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Packing slip
            </Button>
          </>
        }
      />

      {unpaid && (
        <p className="mb-6 rounded-card border border-accent/50 bg-accent-soft/40 px-5 py-4 text-[0.9rem]">
          <strong className="font-medium">Not paid yet.</strong> The customer started checkout but payment hasn&apos;t come through.
          Don&apos;t pack it — it turns into a normal order automatically if they pay.
        </p>
      )}
      {order.staffNote && order.staffNote.startsWith("Not enough stock") && (
        <p className="mb-6 rounded-card border border-danger/40 bg-danger/5 px-5 py-4 text-[0.9rem] text-danger">{order.staffNote}</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {!unpaid && (
            <Panel title="Progress">
              <OrderTimeline order={order} />
              {order.tracking && (
                <p className="mt-5 text-[0.88rem]">
                  <Truck className="mr-2 inline size-4" />
                  {order.tracking.carrier} · {order.tracking.number}
                </p>
              )}
            </Panel>
          )}

          {kits.map(({ bundle, lines }) => (
            <Panel
              key={bundle.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {bundle.name}
                  <Badge tone="brand">Built kit</Badge>
                </span>
              }
              action={<span className="text-[0.82rem] text-muted">{bundle.summary}</span>}
              bodyClassName="p-0"
            >
              <ItemList lines={lines} />
              <p className="flex justify-between border-t border-line px-5 py-3 text-[0.88rem]">
                <span className="text-muted">Kit total · {lines.length} items</span>
                <span className="font-medium tabular-nums">{formatPrice(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}</span>
              </p>
            </Panel>
          ))}

          {singles.length > 0 && (
            <Panel title={kits.length ? `Other products (${singles.length})` : `Items (${singles.length})`} bodyClassName="p-0">
              <ItemList lines={singles} />
            </Panel>
          )}

          <Panel title="Payment summary">
            <dl className="space-y-2 text-[0.88rem]">
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
            {order.paymentReference && <p className="mt-3 break-all text-[0.78rem] text-muted">Payment ref: {order.paymentReference}</p>}
          </Panel>

          <Panel title="History">
            <ol className="space-y-3 text-[0.86rem]">
              {[...order.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                  <span>
                    <span className="font-medium">{orderStatusLabel[h.status as OrderStatus] ?? h.status}</span> ·{" "}
                    <span className="text-muted">{formatDateTime(h.at)}</span>
                    {h.note && <span className="block text-muted">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          {!unpaid && (
            <Panel title="Next step">
              {options.length === 0 ? (
                <p className="text-[0.88rem] text-muted">This order is closed — nothing more to do.</p>
              ) : (
                <div className="grid gap-2">
                  {options.map((s) =>
                    s === "shipped" ? (
                      <Button key={s} onClick={() => setShipOpen(true)}>
                        <Truck /> Mark shipped
                      </Button>
                    ) : s === "refunded" ? (
                      <ConfirmAction
                        key={s}
                        trigger={
                          <Button variant="outline" className="text-danger">
                            Refund order
                          </Button>
                        }
                        title="Refund this order?"
                        description={`${formatPrice(order.totals.total)} goes back to the customer. Razorpay payments are refunded automatically; anything else is recorded so you can pay back by hand.`}
                        confirmLabel="Issue refund"
                        destructive
                        onConfirm={refund}
                      />
                    ) : s === "cancelled" ? (
                      <ConfirmAction
                        key={s}
                        trigger={
                          <Button variant="outline" className="text-danger">
                            Cancel order
                          </Button>
                        }
                        title="Cancel this order?"
                        description="Its stock goes back on sale. If the customer paid, refund them next."
                        confirmLabel="Cancel order"
                        destructive
                        onConfirm={() => transition("cancelled")}
                      />
                    ) : (
                      <Button key={s} variant={s === "delivered" ? "primary" : "secondary"} onClick={() => transition(s)}>
                        {s === "processing"
                          ? "Start packing"
                          : s === "delivered" && cashDue(order)
                            ? "Mark delivered · cash collected"
                            : `Mark ${orderStatusLabel[s].toLowerCase()}`}
                      </Button>
                    ),
                  )}
                </div>
              )}
              {cashDue(order) && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-[0.85rem] text-muted">
                    Cash on delivery — collect <span className="font-medium text-ink">{formatPrice(order.totals.total)}</span> on delivery.
                  </p>
                  {order.status !== "shipped" && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => void collectCash()}>
                      Mark cash collected
                    </Button>
                  )}
                </div>
              )}
            </Panel>
          )}

          <Panel title="Customer">
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-[0.86rem]">
              <a href={`mailto:${order.customer.email}`} className="text-muted hover:text-ink">
                {order.customer.email}
              </a>
            </p>
            <p className="text-[0.86rem]">
              <a href={`tel:${order.customer.phone}`} className="text-muted hover:text-ink">
                {order.customer.phone}
              </a>
            </p>
          </Panel>

          <Panel title="Deliver to">
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

          <Panel title="Team note">
            <Field label="Only the shop team sees this" htmlFor="staff-note">
              <Textarea id="staff-note" rows={3} className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button size="sm" variant="outline" className="mt-3" onClick={saveNote} disabled={(order.staffNote ?? "") === note.trim()}>
              <StickyNote /> Save note
            </Button>
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
              toast.error("Add the courier and tracking number");
              return;
            }
            void transition("shipped", { tracking: { carrier: carrier.trim(), number: tracking.trim() } }, `Shipped via ${carrier.trim()}`);
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

function ItemList({ lines }: { lines: OrderLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={`${l.bundle?.id ?? "single"}-${l.variantId}`} className="flex items-center gap-4 px-5 py-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-control bg-surface">
            <Image src={l.image.src} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <div className="min-w-0 flex-1 text-[0.88rem]">
            <p className="font-medium">{l.name}</p>
            <p className="text-muted">
              {l.variantLabel || "Standard"} · {l.quantity} × {formatPrice(l.unitPrice)}
            </p>
            {l.giftMessage && <p className="text-[0.8rem] italic text-muted">Gift note: “{l.giftMessage}”</p>}
          </div>
          <p className={cn("tabular-nums", "text-[0.9rem]")}>{formatPrice(l.unitPrice * l.quantity)}</p>
        </li>
      ))}
    </ul>
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
