"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { statusTone } from "@/components/account/order-detail";
import { Badge } from "@/components/ui/primitives";
import { DEMO_TODAY, customers } from "@/lib/data/admin";
import { orderStatusLabel } from "@/lib/order-status";
import { adminStore } from "@/lib/store/admin-store";
import { formatDate, formatPrice, variantLabel } from "@/lib/utils";
import { AdminHeader, Panel, StatCard } from "./admin-ui";
import { RevenueChart, type DailyPoint } from "./revenue-chart";

const LOW_STOCK = 5;
const DAYS = 30;

export function Dashboard() {
  const { orders, products } = adminStore.useStore();

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const revenue = paid.reduce((s, o) => s + o.totals.total, 0);
  const open = orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status));
  const activeProducts = products.filter((p) => p.status === "active");
  const lowStock = products.flatMap((p) =>
    p.status === "archived" ? [] : p.variants.filter((v) => v.stock <= LOW_STOCK).map((v) => ({ product: p, variant: v })),
  );

  // Daily revenue for the chart, anchored on the demo "today".
  const days: DailyPoint[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(DEMO_TODAY.getTime() - (DAYS - 1 - i) * 86_400_000);
    return { date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 };
  });
  for (const o of paid) {
    const day = days.find((d) => d.date === o.createdAt.slice(0, 10));
    if (day) {
      day.revenue += o.totals.total;
      day.orders += 1;
    }
  }

  const top = new Map<string, { name: string; units: number; revenue: number; image: string }>();
  for (const o of paid)
    for (const l of o.lines) {
      const e = top.get(l.productId) ?? { name: l.name, units: 0, revenue: 0, image: l.image.src };
      e.units += l.quantity;
      e.revenue += l.unitPrice * l.quantity;
      top.set(l.productId, e);
    }
  const topProducts = [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topMax = topProducts[0]?.revenue ?? 1;

  return (
    <>
      <AdminHeader title="Dashboard" description={`Store overview · figures computed from ${orders.length} demo orders`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatPrice(revenue)} hint={`${paid.length} paid orders`} href="/admin/orders" />
        <StatCard
          label="Orders"
          value={orders.length}
          hint={`${orders.filter((o) => o.status === "cancelled").length} cancelled`}
          href="/admin/orders"
        />
        <StatCard label="Open orders" value={open.length} hint="Pending, confirmed or processing" href="/admin/orders" />
        <StatCard label="Customers" value={customers.length} hint={`${activeProducts.length} active products`} href="/admin/customers" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <RevenueChart data={days} />
        </Panel>

        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-4 text-accent-ink" /> Low stock
            </span>
          }
          action={
            <Link href="/admin/inventory" className="text-[0.78rem] text-muted underline underline-offset-4 hover:text-ink">
              Inventory
            </Link>
          }
          bodyClassName="p-0"
        >
          {lowStock.length === 0 ? (
            <p className="p-5 text-[0.88rem] text-muted">All variants are above {LOW_STOCK} units.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {lowStock.map(({ product, variant }) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                  <span className="min-w-0">
                    <span className="block truncate">{product.name}</span>
                    <span className="text-[0.78rem] text-muted">{variantLabel(variant.options) || "Default"}</span>
                  </span>
                  <Badge tone={variant.stock === 0 ? "danger" : "accent"}>{variant.stock === 0 ? "Out" : `${variant.stock} left`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          title="Recent orders"
          className="xl:col-span-2"
          bodyClassName="p-0"
          action={
            <Link href="/admin/orders" className="text-[0.78rem] text-muted underline underline-offset-4 hover:text-ink">
              View all
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[0.86rem]">
              <tbody>
                {orders.slice(0, 7).map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-brand">
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{o.customer.name}</td>
                    <td className="px-5 py-3 text-muted">{formatDate(o.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(o.status)}>{orderStatusLabel[o.status]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatPrice(o.totals.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Top-selling products">
          <ul className="space-y-4">
            {topProducts.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface">
                  <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3 text-[0.85rem]">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 tabular-nums">{formatPrice(p.revenue)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(p.revenue / topMax) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[0.75rem] text-muted">{p.units} units</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
