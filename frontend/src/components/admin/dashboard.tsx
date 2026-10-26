"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Inbox, Package, Puzzle, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import type { AdminData } from "@/lib/admin-data";
import { adminStore } from "@/lib/store/admin-store";
import type { Order, OrderKind } from "@/lib/types";
import { cn, formatPrice, variantLabel } from "@/lib/utils";
import { AdminHeader, Panel, StatCard } from "./admin-ui";
import { RevenueChart, type DailyPoint } from "./revenue-chart";

const LOW_STOCK = 5;
const DAYS = 30;

const kindOf = (o: Order): OrderKind[] => o.kinds ?? ["regular"];

/** The most useful things to do right now, in order. */
function todo(d: AdminData) {
  const toPack = d.orders.filter((o) => o.status === "confirmed" || o.status === "processing");
  return [
    {
      href: "/admin/orders",
      icon: Package,
      count: toPack.length,
      label: "orders to pack",
      hint: toPack.length
        ? `Oldest from ${new Date(toPack[toPack.length - 1].createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
        : "All caught up",
    },
    {
      href: "/admin/custom-orders",
      icon: Sparkles,
      count: d.customRequests.filter((r) => r.status === "new").length,
      label: "custom order requests",
      hint: "Waiting for a quote",
    },
    {
      href: "/admin/enquiries",
      icon: Inbox,
      count: d.enquiries.filter((e) => e.status === "new").length,
      label: "new messages",
      hint: "From the contact form",
    },
  ];
}

export function Dashboard() {
  const data = adminStore.useStore();
  const { orders, products } = data;
  const [today] = useState(() => new Date());

  const paid = orders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "refunded");
  const kept = paid.filter((o) => o.status !== "refunded" && o.status !== "cancelled");
  const since = new Date(today.getTime() - (DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const recent = kept.filter((o) => o.createdAt.slice(0, 10) >= since);
  const revenue = recent.reduce((s, o) => s + o.totals.total, 0);
  const lowStock = products.flatMap((p) =>
    p.status !== "active" ? [] : p.variants.filter((v) => v.stock <= LOW_STOCK).map((v) => ({ product: p, variant: v })),
  );

  const days: DailyPoint[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today.getTime() - (DAYS - 1 - i) * 86_400_000);
    return { date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 };
  });
  for (const o of recent) {
    const day = days.find((d) => d.date === o.createdAt.slice(0, 10));
    if (day) {
      day.revenue += o.totals.total;
      day.orders += 1;
    }
  }

  const byKind = (["regular", "built-kit"] as const).map((k) => {
    const list = recent.filter((o) => kindOf(o).includes(k));
    return { kind: k, orders: list.length, revenue: list.reduce((s, o) => s + o.totals.total, 0) };
  });

  const top = new Map<string, { name: string; units: number; revenue: number; image: string }>();
  for (const o of recent)
    for (const l of o.lines) {
      const key = l.bundle ? `kit:${l.bundle.name}` : l.productId;
      const e = top.get(key) ?? { name: l.bundle ? l.bundle.name : l.name, units: 0, revenue: 0, image: l.image.src };
      e.units += l.bundle ? 0 : l.quantity;
      e.revenue += l.unitPrice * l.quantity;
      top.set(key, e);
    }
  const topSellers = [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topMax = topSellers[0]?.revenue || 1;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description={`Today, ${today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <section aria-label="To do" className="mb-8 grid gap-3 md:grid-cols-3">
        {todo(data).map(({ href, icon: Icon, count, label, hint }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center gap-4 rounded-card border p-5 transition-colors",
              count ? "border-brand/40 bg-brand/5 hover:border-brand" : "border-line bg-raised hover:border-ink",
            )}
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full",
                count ? "bg-brand text-brand-ink" : "bg-surface text-muted",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.05rem] font-medium">
                <span className="tabular-nums">{count}</span> {label}
              </span>
              <span className="block text-[0.8rem] text-muted">{hint}</span>
            </span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales · last 30 days" value={formatPrice(revenue)} hint={`${recent.length} paid orders`} href="/admin/orders" />
        <StatCard
          label="Average order"
          value={recent.length ? formatPrice(Math.round(revenue / recent.length)) : "—"}
          hint="Last 30 days"
        />
        <StatCard
          label="Customers"
          value={data.customers.length}
          hint={`${data.customers.filter((c) => c.hasAccount).length} with an account`}
          href="/admin/customers"
        />
        <StatCard
          label="Low stock"
          value={lowStock.length}
          hint={lowStock.length ? "Options with 5 or fewer left" : "Everything well stocked"}
          href="/admin/inventory"
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Package className="size-6 stroke-[1.25]" />}
          title="No orders yet"
          description="When customers check out, their orders appear here and in Orders — sorted into products and built kits."
          action={
            <Link href="/" target="_blank" className={buttonVariants({ variant: "outline" })}>
              Open the shop
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
          <Panel title="Sales · last 30 days">
            <RevenueChart data={days} />
          </Panel>
          <Panel title="By order kind" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {byKind.map((k) => (
                <li key={k.kind}>
                  <Link
                    href={k.kind === "regular" ? "/admin/orders?kind=regular" : `/admin/orders?kind=${k.kind}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-surface/60"
                  >
                    {k.kind === "regular" ? (
                      <Package className="size-4 text-muted" />
                    ) : (
                      <Puzzle className="size-4 text-brand" />
                    )}
                    <span className="min-w-0 flex-1 text-[0.9rem]">
                      {k.kind === "regular" ? "Product orders" : "Built kit orders"}
                      <span className="block text-[0.78rem] text-muted">{k.orders} orders</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatPrice(k.revenue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Best sellers · last 30 days" bodyClassName="p-0">
          {topSellers.length === 0 ? (
            <p className="px-5 py-6 text-[0.88rem] text-muted">Your best sellers will show here once orders come in.</p>
          ) : (
            <ul className="divide-y divide-line">
              {topSellers.map((p) => (
                <li key={p.name} className="flex items-center gap-4 px-5 py-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface">
                    <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9rem] font-medium">{p.name}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(p.revenue / topMax) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-right text-[0.88rem] tabular-nums">{formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Running low"
          bodyClassName="p-0"
          action={
            <Link href="/admin/inventory" className="text-[0.8rem] underline underline-offset-4">
              Stock levels
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <p className="px-5 py-6 text-[0.88rem] text-muted">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.slice(0, 8).map(({ product, variant }) => (
                <li key={variant.id} className="flex items-center gap-3 px-5 py-3 text-[0.88rem]">
                  <AlertTriangle className={cn("size-4 shrink-0", variant.stock === 0 ? "text-danger" : "text-accent-ink")} />
                  <span className="min-w-0 flex-1 truncate">
                    {product.name}
                    {variantLabel(variant.options) && <span className="text-muted"> · {variantLabel(variant.options)}</span>}
                  </span>
                  <span className={cn("tabular-nums", variant.stock === 0 && "font-medium text-danger")}>
                    {variant.stock === 0 ? "Sold out" : `${variant.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
