"use client";

import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Category, ImageAsset } from "@/lib/types";
import { formatDateTime, slugify, variantLabel, newId } from "@/lib/utils";
import { categoryFormSchema } from "@/lib/validations";
import { AdminHeader, ConfirmAction, DataTable, Panel, Toggle, type Column } from "./admin-ui";
import { ImageField } from "./image-upload";

/* -------------------------------- Categories ----------------------------- */
type CategoryValues = z.input<typeof categoryFormSchema>;

export function CategoriesAdmin() {
  const { categories, products } = adminStore.useStore();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const count = (slug: string) => products.filter((p) => p.categorySlug === slug && p.status !== "archived").length;
  const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  const move = (id: string, dir: -1 | 1) =>
    updateAdmin((d) => {
      const list = [...d.categories].sort((a, b) => a.displayOrder - b.displayOrder);
      const i = list.findIndex((c) => c.id === id);
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((c, k) => (c.displayOrder = k + 1));
      d.categories = list;
    });

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Category",
      cell: (c) => (
        <span className="flex items-center gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface">
            <Image src={c.image.src} alt="" fill sizes="44px" className="object-cover" />
          </span>
          <span>
            <span className="block font-medium">{c.name}</span>
            <span className="text-[0.78rem] text-muted">/category/{c.slug}</span>
          </span>
        </span>
      ),
    },
    { key: "parent", header: "Parent", cell: (c) => categories.find((p) => p.id === c.parentId)?.name ?? "—" },
    { key: "products", header: "Products", cell: (c) => count(c.slug) },
    {
      key: "status",
      header: "Status",
      cell: (c) => <Badge tone={c.isActive ? "success" : "muted"}>{c.isActive ? "Visible" : "Hidden"}</Badge>,
    },
    {
      key: "order",
      header: "Order",
      cell: (c) => (
        <span className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Move ${c.name} up`} onClick={() => move(c.id, -1)}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Move ${c.name} down`} onClick={() => move(c.id, 1)}>
            <ArrowDown />
          </Button>
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <span className="inline-flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
            <Pencil />
          </Button>
          <ConfirmAction
            trigger={
              <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Delete ${c.name}`}>
                <Trash2 />
              </Button>
            }
            title={`Delete “${c.name}”?`}
            description={
              count(c.slug) > 0
                ? `${count(c.slug)} products use this category. Hide it instead, or move those products first.`
                : "This category has no products and will be removed."
            }
            confirmLabel={count(c.slug) > 0 ? "Hide instead" : "Delete"}
            destructive={count(c.slug) === 0}
            onConfirm={() => {
              updateAdmin((d) => {
                if (count(c.slug) > 0) d.categories.find((x) => x.id === c.id)!.isActive = false;
                else d.categories = d.categories.filter((x) => x.id !== c.id);
              });
              toast(count(c.slug) > 0 ? "Category hidden" : "Category deleted");
            }}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Categories"
        description="Order here controls navigation and the homepage grid."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add category
          </Button>
        }
      />
      <DataTable rows={sorted} columns={columns} rowKey={(c) => c.id} searchText={(c) => c.name} pageSize={20} />
      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "New category" : "Edit category"}
      >
        {editing !== null && (
          <CategoryForm category={editing === "new" ? undefined : editing} parents={categories} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </>
  );
}

function CategoryForm({ category, parents, onDone }: { category?: Category; parents: Category[]; onDone: () => void }) {
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [image, setImage] = useState<ImageAsset | undefined>(category?.image);
  const { register, handleSubmit, formState, setValue, getValues, setError } = useForm<
    CategoryValues,
    unknown,
    z.output<typeof categoryFormSchema>
  >({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      parentId: category?.parentId ?? "",
      displayOrder: category?.displayOrder ?? parents.length + 1,
      isActive: category?.isActive ?? true,
      seoTitle: category?.seoTitle ?? "",
      seoDescription: category?.seoDescription ?? "",
    },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit((v) => {
        if (!image) {
          toast.error("Add a category image");
          return;
        }
        if (adminStore.get().categories.some((c) => c.slug === v.slug && c.id !== category?.id)) {
          setError("slug", { message: "Slug already in use" });
          return;
        }
        updateAdmin((d) => {
          const next: Category = {
            id: category?.id ?? newId("cat"),
            slug: v.slug,
            name: v.name,
            description: v.description,
            image: { ...image, alt: image.alt.trim() || v.name },
            parentId: v.parentId || null,
            displayOrder: v.displayOrder,
            isActive,
            seoTitle: v.seoTitle || undefined,
            seoDescription: v.seoDescription || undefined,
          };
          const i = d.categories.findIndex((c) => c.id === next.id);
          if (i >= 0) {
            // Keep product references in sync if the slug changed.
            const old = d.categories[i].slug;
            if (old !== next.slug) d.products.forEach((p) => p.categorySlug === old && (p.categorySlug = next.slug));
            d.categories[i] = next;
          } else d.categories.push(next);
        });
        toast.success("Category saved");
        onDone();
      })}
    >
      <ImageField
        id="cat-image"
        label="Category image"
        value={image}
        onChange={setImage}
        folder="categories"
        aspect="aspect-[4/5]"
        removable={false}
      />
      <Field label="Name" htmlFor="cat-name" error={e.name?.message}>
        <Input
          {...fieldAria("cat-name", e.name?.message)}
          {...register("name", { onBlur: (ev) => !getValues("slug") && setValue("slug", slugify(ev.target.value)) })}
        />
      </Field>
      <Field label="Slug" htmlFor="cat-slug" error={e.slug?.message}>
        <Input {...fieldAria("cat-slug", e.slug?.message)} {...register("slug")} />
      </Field>
      <Field label="Description" htmlFor="cat-desc" error={e.description?.message}>
        <Textarea rows={3} className="min-h-24" {...fieldAria("cat-desc", e.description?.message)} {...register("description")} />
      </Field>
      <Field label="Parent category" htmlFor="cat-parent" optional>
        <Select id="cat-parent" {...register("parentId")}>
          <option value="">None (top level)</option>
          {parents
            .filter((p) => p.id !== category?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Display order" htmlFor="cat-order" error={e.displayOrder?.message}>
        <Input type="number" min={0} {...fieldAria("cat-order", e.displayOrder?.message)} {...register("displayOrder")} />
      </Field>
      <Toggle checked={isActive} onChange={setIsActive} label="Visible in store" />
      <Field label="SEO title" htmlFor="cat-seo" optional error={e.seoTitle?.message}>
        <Input {...fieldAria("cat-seo", e.seoTitle?.message)} {...register("seoTitle")} />
      </Field>
      <Field label="Meta description" htmlFor="cat-meta" optional error={e.seoDescription?.message}>
        <Textarea rows={2} className="min-h-20" {...fieldAria("cat-meta", e.seoDescription?.message)} {...register("seoDescription")} />
      </Field>
      <Button type="submit" className="w-full">
        Save category
      </Button>
    </form>
  );
}

/* --------------------------------- Inventory ----------------------------- */
interface StockRow {
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  label: string;
  stock: number;
  image: string;
}

export function InventoryAdmin() {
  const { products, stockMovements } = adminStore.useStore();
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("Restock");

  const rows: StockRow[] = products
    .filter((p) => p.status !== "archived")
    .flatMap((p) =>
      p.variants.map((v) => ({
        productId: p.id,
        productName: p.name,
        variantId: v.id,
        sku: v.sku,
        label: variantLabel(v.options) || "Default",
        stock: v.stock,
        image: p.images[0]?.src ?? "",
      })),
    )
    .filter((r) => !onlyLow || r.stock <= 5);

  const columns: Column<StockRow>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (r) => r.productName,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-chip bg-surface">
            {r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />}
          </span>
          <span>
            <span className="block">{r.productName}</span>
            <span className="text-[0.78rem] text-muted">{r.label}</span>
          </span>
        </span>
      ),
    },
    { key: "sku", header: "SKU", sortValue: (r) => r.sku, cell: (r) => <span className="font-mono text-[0.8rem]">{r.sku}</span> },
    {
      key: "stock",
      header: "On hand",
      sortValue: (r) => r.stock,
      cell: (r) => <Badge tone={r.stock === 0 ? "danger" : r.stock <= 5 ? "accent" : "success"}>{r.stock}</Badge>,
    },
    {
      key: "adjust",
      header: "",
      className: "text-right",
      cell: (r) => (
        <Button variant="outline" size="sm" className="h-8" onClick={() => (setAdjusting(r), setDelta(""), setReason("Restock"))}>
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Inventory"
        description="Variant-level stock. Checkout reserves stock atomically on the server once connected, preventing overselling."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.variantId}
          searchText={(r) => `${r.productName} ${r.sku}`}
          searchPlaceholder="Search product or SKU"
          initialSort={{ key: "stock", dir: "asc" }}
          pageSize={15}
          toolbar={
            <label className="flex items-center gap-2 text-[0.85rem]">
              <input
                type="checkbox"
                checked={onlyLow}
                onChange={(e) => setOnlyLow(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              Low stock only (≤ 5)
            </label>
          }
        />
        <Panel title="Stock movements" bodyClassName="p-0">
          {stockMovements.length === 0 ? (
            <p className="p-5 text-[0.86rem] text-muted">Adjustments you make appear here with who, when and why.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
              {stockMovements.map((m) => (
                <li key={m.id} className="px-5 py-3 text-[0.84rem]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{m.productName}</span>
                    <span className={m.delta > 0 ? "text-success" : "text-danger"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  </div>
                  <p className="text-[0.76rem] text-muted">
                    {m.variantLabel} · {m.reason} · {formatDateTime(m.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Sheet
        open={adjusting !== null}
        onOpenChange={(o) => !o && setAdjusting(null)}
        title="Adjust stock"
        description={adjusting ? `${adjusting.productName} · ${adjusting.label} · ${adjusting.stock} on hand` : undefined}
        side="center"
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(delta);
            if (!adjusting || !Number.isInteger(n) || n === 0) {
              toast.error("Enter a whole number, e.g. 10 or -2");
              return;
            }
            if (adjusting.stock + n < 0) {
              toast.error("Stock can't go below zero");
              return;
            }
            updateAdmin((d) => {
              const v = d.products.find((p) => p.id === adjusting.productId)?.variants.find((x) => x.id === adjusting.variantId);
              if (!v) return;
              v.stock += n;
              d.stockMovements.unshift({
                id: newId("mv"),
                at: new Date().toISOString(),
                variantId: v.id,
                productName: adjusting.productName,
                variantLabel: adjusting.label,
                delta: n,
                reason,
              });
            });
            toast.success("Stock updated");
            setAdjusting(null);
          }}
        >
          <Field label="Change (use a minus for removals)" htmlFor="delta">
            <Input
              id="delta"
              type="number"
              inputMode="numeric"
              step={1}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 10 or -2"
            />
          </Field>
          <Field label="Reason" htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Restock</option>
              <option>Damaged</option>
              <option>Stock count correction</option>
              <option>Returned to stock</option>
              <option>Used for display</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Save adjustment
          </Button>
        </form>
      </Sheet>
    </>
  );
}
