"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Product, ProductStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { AdminHeader, DataTable, downloadCsv, type Column } from "./admin-ui";

const statusTone = { active: "success", draft: "muted", archived: "danger" } as const;

export function ProductsAdmin() {
  const { products, categories } = adminStore.useStore();
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const [category, setCategory] = useState("all");

  const rows = products.filter((p) => (status === "all" || p.status === status) && (category === "all" || p.categorySlug === category));
  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? "—";

  const setStatuses = (ids: string[], next: ProductStatus) => {
    updateAdmin((d) => {
      d.products.forEach((p) => {
        if (ids.includes(p.id)) p.status = next;
      });
    });
    toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} set to ${next}`);
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name,
      cell: (p) => (
        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-brand">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface">
            {p.images[0] && <Image src={p.images[0].src} alt="" fill sizes="44px" className="object-cover" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            <span className="text-[0.78rem] text-muted">{p.sku}</span>
          </span>
        </Link>
      ),
    },
    { key: "category", header: "Category", sortValue: (p) => catName(p.categorySlug), cell: (p) => catName(p.categorySlug) },
    {
      key: "price",
      header: "Price",
      sortValue: (p) => Math.min(...p.variants.map((v) => v.price)),
      cell: (p) => {
        const prices = p.variants.map((v) => v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return <span className="tabular-nums">{min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}</span>;
      },
    },
    {
      key: "stock",
      header: "Stock",
      sortValue: (p) => p.variants.reduce((s, v) => s + v.stock, 0),
      cell: (p) => {
        const total = p.variants.reduce((s, v) => s + v.stock, 0);
        return (
          <span className={total === 0 ? "text-danger" : total <= 5 ? "text-accent-ink" : ""}>
            {total} <span className="text-muted">· {p.variants.length} var.</span>
          </span>
        );
      },
    },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <Badge tone={statusTone[p.status]}>{p.status}</Badge> },
    {
      key: "flags",
      header: "Merchandising",
      cell: (p) => (
        <span className="text-[0.78rem] text-muted">
          {[p.isFeatured && "Featured", p.isNewArrival && "New"].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Products"
        description={`${products.length} products · ${products.filter((p) => p.status === "active").length} active`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv("products.csv", [
                  ["Name", "SKU", "Category", "Status", "Variant SKU", "Price (INR)", "Stock"],
                  ...products.flatMap((p) =>
                    p.variants.map((v) => [p.name, p.sku, catName(p.categorySlug), p.status, v.sku, v.price / 100, v.stock]),
                  ),
                ])
              }
            >
              <Download /> Export
            </Button>
            <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })}>
              <Plus /> Add product
            </Link>
          </>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        searchText={(p) => `${p.name} ${p.sku} ${p.variants.map((v) => v.sku).join(" ")}`}
        searchPlaceholder="Search name or SKU"
        selectable
        initialSort={{ key: "name", dir: "asc" }}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-10 w-36 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-48 text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        }
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={() => (setStatuses(ids, "active"), clear())}>
              Activate
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => (setStatuses(ids, "draft"), clear())}>
              Move to draft
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => (setStatuses(ids, "archived"), clear())}>
              Archive
            </Button>
          </>
        )}
      />
    </>
  );
}
