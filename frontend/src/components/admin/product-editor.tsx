"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { ArrowDown, ArrowUp, Check, Layers, Package, Pencil, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { isKitProduct } from "@/lib/kit/kit-product";
import { ImageDropzone, UploadQueue, useImageUploads } from "./image-upload";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Product } from "@/lib/types";
import { cn, slugify, newId } from "@/lib/utils";
import { productFormSchema } from "@/lib/validations";
import { AdminHeader, ConfirmAction, Panel, Toggle } from "./admin-ui";

type Values = z.input<typeof productFormSchema>;

const splitValues = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/** "Extra large" → "EXTRA-LARGE", for readable variant SKUs. */
const skuPart = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14) || "V";

/** Values as removable chips; type one and press Enter (or comma) to add it. */
function ValueChips({
  values,
  onChange,
  label,
  invalid,
  placeholder = "e.g. Small, Medium",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = [...values];
    for (const v of splitValues(draft)) if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
    if (next.length !== values.length) onChange(next);
    setDraft("");
  };
  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-control border bg-canvas p-1 focus-within:border-ink",
        invalid ? "border-danger" : "border-line-strong",
      )}
    >
      {values.map((v) => (
        <span key={v} className="inline-flex h-8 items-center gap-1 rounded-full bg-surface pl-3 pr-1 text-[0.85rem]">
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="grid size-6 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(ev) => setDraft(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === ",") {
            ev.preventDefault();
            add();
          }
        }}
        onBlur={add}
        aria-label={label}
        placeholder={values.length ? "Add another…" : placeholder}
        className="h-8 min-w-[12rem] flex-1 bg-transparent px-2 text-sm focus:outline-none"
      />
      {draft.trim() && (
        <Button type="button" variant="outline" size="sm" className="h-8" onMouseDown={(ev) => ev.preventDefault()} onClick={add}>
          <Plus /> Add
        </Button>
      )}
    </div>
  );
}
type Parsed = z.output<typeof productFormSchema>;

/** Common things a product varies by, with example choices for the placeholder. */
const OPTION_PRESETS = [
  { name: "Size", example: "Small, Medium, Large" },
  { name: "Colour", example: "White, Blue, Gold" },
  { name: "Pack size", example: "Pack of 6, Pack of 12" },
  { name: "Material", example: "Wood, Brass" },
  { name: "Design", example: "Floral, Classic" },
];

/** A big either/or choice: "One version" or "Different options". */
function ChoiceCard({
  pressed,
  icon,
  title,
  text,
  className,
  ...props
}: ComponentProps<"button"> & { pressed: boolean; icon: ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "relative flex items-start gap-3 rounded-card border p-4 text-left transition-colors [&>span>svg]:size-5",
        pressed ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-line-strong hover:border-ink",
        className,
      )}
      {...props}
    >
      <span
        className={cn("grid size-10 shrink-0 place-items-center rounded-full", pressed ? "bg-brand text-brand-ink" : "bg-surface text-ink")}
      >
        {icon}
      </span>
      <span className="min-w-0 pr-6">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-snug text-muted">{text}</span>
      </span>
      {pressed && <Check aria-hidden className="absolute right-4 top-4 size-4 text-brand" />}
    </button>
  );
}

const cellClass = (err?: string) =>
  cn(
    "h-10 w-full rounded-control border bg-canvas px-3 text-sm tabular-nums focus:border-ink focus:outline-none",
    err ? "border-danger" : "border-line-strong",
  );

/** A rupee amount: ₹ shown inside the box. */
function MoneyInput({ invalid, className, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
        ₹
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        className={cn(cellClass(invalid ? "x" : undefined), "pl-7", className)}
        {...props}
      />
    </span>
  );
}

/** One cell of a version row; on phones it carries its own label. */
function CellField({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <span aria-hidden className="mb-1 block text-[0.7rem] uppercase tracking-[0.12em] text-muted md:hidden">
        {label}
      </span>
      {children}
      {error && <p className="mt-1 text-[0.72rem] text-danger">{error}</p>}
    </div>
  );
}

/** Column layout for the version rows (with or without the version, SKU and remove columns). */
const rowGrid = (sku: boolean, remove: boolean, named = true) =>
  !named
    ? sku
      ? "md:grid-cols-[1fr_1fr_0.8fr_1.2fr]"
      : "md:grid-cols-[1fr_1fr_0.8fr]"
    : sku
      ? remove
        ? "md:grid-cols-[minmax(7rem,1.1fr)_1fr_1fr_0.8fr_1.2fr_2.5rem]"
        : "md:grid-cols-[minmax(7rem,1.1fr)_1fr_1fr_0.8fr_1.2fr]"
      : remove
        ? "md:grid-cols-[minmax(7rem,1.4fr)_1fr_1fr_0.8fr_2.5rem]"
        : "md:grid-cols-[minmax(7rem,1.4fr)_1fr_1fr_0.8fr]";

function toValues(p?: Product): Values {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    sku: p?.sku ?? "",
    shortDescription: p?.shortDescription ?? "",
    description: p?.description.join("\n\n") ?? "",
    categorySlug: p?.categorySlug ?? "",
    status: p?.status ?? "draft",
    isFeatured: p?.isFeatured ?? false,
    isNewArrival: p?.isNewArrival ?? true,
    colour: p?.colour ?? "",
    careInfo: p?.careInfo ?? "",
    giftMessage: p?.customization?.giftMessage ?? false,
    customPackaging: p?.customization?.customPackaging ?? false,
    quoteOnRequest: p?.customization?.quoteOnRequest ?? false,
    seoTitle: p?.seoTitle ?? "",
    seoDescription: p?.seoDescription ?? "",
    images: p?.images ?? [],
    options: p?.options.map((o) => ({ name: o.name, values: o.values.join(", ") })) ?? [],
    variants: p?.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: Object.values(v.options).join(" / ") || "Default",
      options: v.options,
      price: v.price / 100,
      compareAtPrice: v.compareAtPrice ? v.compareAtPrice / 100 : "",
      stock: v.stock,
    })) ?? [{ id: "v1", sku: "", label: "Default", options: {}, price: "", compareAtPrice: "", stock: 0 }],
    attributes: p ? Object.entries(p.attributes).map(([key, value]) => ({ key, value })) : [],
  };
}

export function ProductEditor({ productId }: { productId?: string }) {
  const { products, categories } = adminStore.useStore();
  const existing = productId ? products.find((p) => p.id === productId) : undefined;
  if (existing && isKitProduct(existing)) {
    return (
      <EmptyState
        title="This is a kit product"
        description="Kit products have per-trami ratios and occasions, so they're edited in their own section."
        action={
          <Link href={`/admin/kit-products/${existing.id}`} className={buttonVariants()}>
            Edit in Kit products
          </Link>
        }
      />
    );
  }
  if (productId && !existing) {
    return (
      <EmptyState
        title="Product not found"
        description="It may have been deleted. Check Products for the current list."
        action={
          <Link href="/admin/products" className={buttonVariants()}>
            Back to products
          </Link>
        }
      />
    );
  }
  return (
    <EditorForm
      key={existing?.id ?? "new"}
      product={existing}
      categories={categories}
      allSkus={products
        .filter((p) => p.id !== existing?.id)
        .flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)])
        .map((s) => s.toUpperCase())}
      takenSlugs={products.filter((p) => p.id !== existing?.id).map((p) => p.slug)}
    />
  );
}

function EditorForm({
  product,
  categories,
  allSkus,
  takenSlugs,
}: {
  product?: Product;
  categories: { slug: string; name: string }[];
  /** Product and variant codes of every other product. */
  allSkus: string[];
  /** Web addresses of every other product. */
  takenSlugs: string[];
}) {
  const router = useRouter();
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toValues(product),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, getValues, formState, setError } = form;
  const e = formState.errors;
  const images = useFieldArray({ control, name: "images" });
  const uploads = useImageUploads("products", (image) => images.append(image));
  const variants = useFieldArray({ control, name: "variants" });
  const options = useFieldArray({ control, name: "options" });
  const attributes = useFieldArray({ control, name: "attributes" });
  const [seoTitle, seoDescription, slugValue] = useWatch({ control, name: ["seoTitle", "seoDescription", "slug"] });

  /** "Rose Basket" → "rose-basket", or "rose-basket-2" when another product has it. */
  const uniqueSlug = (from: string) => {
    const base = slugify(from).slice(0, 76).replace(/-+$/, "") || "product";
    let slug = base;
    for (let n = 2; takenSlugs.includes(slug); n++) slug = `${base}-${n}`;
    return slug;
  };
  // New products take their address from the name as it's typed, until it's edited by hand.
  // Saved products keep theirs, so links already shared keep working.
  const [slugManual, setSlugManual] = useState(Boolean(product));
  const [editingSlug, setEditingSlug] = useState(false);
  /** Codes this screen made itself — remade from the name on each save, unlike codes typed in. */
  const [autoSkus] = useState(() => new Set<string>());
  const optionValues = useWatch({ control, name: "options" });
  const watchedVariants = useWatch({ control, name: "variants" });
  // Rows map one-to-one to values only with a single variant type.
  const canRemoveRows = options.fields.length === 1 && variants.fields.length > 1;
  const hasOptions = options.fields.length > 0;
  const optionsHaveValues = (optionValues ?? []).some((o) => splitValues(o?.values ?? "").length > 0);
  const outOfStock = (watchedVariants ?? []).filter((v) => Number(v?.stock ?? 0) === 0).length;
  const [showSkus, setShowSkus] = useState(false);
  const skuErrors = variants.fields.some((_, i) => Boolean(e.variants?.[i]?.sku));
  const skuColumn = showSkus || skuErrors;
  const [bulk, setBulk] = useState({ price: "", stock: "" });

  /**
   * Keeps one variant row per combination of option values. Rows that still
   * exist keep their SKU, price and stock; new rows start with the first
   * row's price. With a single row, adding or removing the first value
   * carries that row over (Default ↔ the one value).
   */
  const syncVariants = (opts: { name: string; values: string }[]) => {
    const list = opts.map((o) => ({ name: o.name.trim() || "Option", values: splitValues(o.values) })).filter((o) => o.values.length);
    let combos: Record<string, string>[] = [{}];
    for (const o of list) combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
    const existing = getValues("variants");
    // With no product code yet, new rows stay blank and get theirs when the product is saved.
    const base = getValues("sku").trim().toUpperCase();
    const taken = new Set(existing.map((v) => v.sku.toUpperCase()));
    variants.replace(
      combos.map((combo) => {
        const label = Object.values(combo).join(" / ") || "Default";
        const match = existing.find((v) => v.label === label) ?? (combos.length === 1 && existing.length === 1 ? existing[0] : undefined);
        const newSku = () => {
          // Codes made from the name are (re)made on save, so a renamed product gets matching ones.
          if (!base || autoSkus.has(base)) return "";
          let sku = [base, ...Object.values(combo).map(skuPart)].join("-").slice(0, 50);
          for (let n = 2; taken.has(sku); n++) sku = `${sku.slice(0, 46)}-${n}`;
          taken.add(sku);
          return sku;
        };
        // A carried-over row keeps its own SKU; an empty one, or the plain base SKU of the old Default row, gets the value added.
        if (match) {
          const own = match.sku.trim();
          const sku = !own || (own.toUpperCase() === base && label !== "Default") ? newSku() : own;
          return { ...match, label, options: combo, sku };
        }
        return { id: newId("v"), sku: newSku(), label, options: combo, price: existing[0]?.price ?? "", compareAtPrice: "", stock: 0 };
      }),
    );
  };

  const setOptionValues = (i: number, values: string[]) => {
    setValue(`options.${i}.values`, values.join(", "), { shouldDirty: true, shouldValidate: formState.isSubmitted });
    syncVariants(getValues("options"));
  };

  const removeOption = (i: number) => {
    const rest = getValues("options").filter((_, j) => j !== i);
    options.remove(i);
    syncVariants(rest);
  };

  /** Removing a row of a one-option product removes that value. */
  const removeVariant = (label: string) => {
    const i = getValues("options").findIndex((o) => splitValues(o.values).includes(label));
    if (i >= 0)
      setOptionValues(
        i,
        splitValues(getValues(`options.${i}.values`)).filter((v) => v !== label),
      );
  };

  /** "Set for all versions": fills price and/or stock on every row. */
  const applyBulk = () => {
    const count = getValues("variants").length;
    for (let i = 0; i < count; i++) {
      if (bulk.price) setValue(`variants.${i}.price`, bulk.price, { shouldDirty: true, shouldValidate: formState.isSubmitted });
      if (bulk.stock) setValue(`variants.${i}.stock`, bulk.stock, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    }
    toast.success(`Updated all ${count} versions`);
    setBulk({ price: "", stock: "" });
  };

  /** Back to a single price and stock, keeping the first version's numbers. */
  const useOneVersion = () => {
    if (!options.fields.length) return;
    const [first] = getValues("variants");
    options.remove();
    variants.replace([{ ...first, id: first?.id ?? newId("v"), label: "Default", options: {}, sku: "" }]);
  };

  /** SKU codes are made from the product name: ROSE-BASKET, ROSE-BASKET-WHITE… — unique across the shop. */
  const fillSkus = () => {
    const auto = autoSkus;
    let base = getValues("sku").trim().toUpperCase();
    if (!base || auto.has(base)) {
      const fromName =
        getValues("name")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 30)
          .replace(/-$/, "") || "SKU";
      base = fromName;
      for (let n = 2; allSkus.includes(base); n++) base = `${fromName}-${n}`;
      auto.add(base);
      setValue("sku", base);
    }
    const rows = getValues("variants");
    const own = (sku: string) => sku.trim() !== "" && !auto.has(sku.trim().toUpperCase());
    const taken = new Set([...allSkus, ...rows.filter((v) => own(v.sku)).map((v) => v.sku.trim().toUpperCase())]);
    rows.forEach((v, i) => {
      if (own(v.sku)) return;
      let sku = [base, ...Object.values(v.options).map(skuPart)].join("-").slice(0, 50);
      for (let n = 2; taken.has(sku); n++) sku = `${sku.slice(0, 46)}-${n}`;
      taken.add(sku);
      auto.add(sku);
      setValue(`variants.${i}.sku`, sku);
    });
  };

  const onSubmit = handleSubmit((v) => {
    let clash = false;
    v.variants.forEach((variant, i) => {
      if (allSkus.includes(variant.sku.toUpperCase())) {
        setError(`variants.${i}.sku`, { message: "SKU already used by another product" });
        clash = true;
      }
    });
    const slugTaken = adminStore.get().products.some((p) => p.slug === v.slug && p.id !== product?.id);
    if (slugTaken) {
      setError("slug", { message: "Another product already uses this address" });
      setEditingSlug(true);
      clash = true;
    }
    if (clash) return;

    const saved: Product = {
      id: product?.id ?? newId("p"),
      slug: v.slug,
      sku: v.sku.toUpperCase(),
      name: v.name,
      shortDescription: v.shortDescription,
      description: v.description
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean),
      categorySlug: v.categorySlug,
      images: v.images,
      options: v.options.map((o) => ({
        name: o.name,
        values: o.values
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      })),
      variants: v.variants.map((x) => ({
        id: x.id,
        sku: x.sku.toUpperCase(),
        options: x.options,
        price: Math.round(Number(x.price) * 100),
        compareAtPrice:
          x.compareAtPrice === "" || x.compareAtPrice === undefined || Number(x.compareAtPrice) === 0
            ? undefined
            : Math.round(Number(x.compareAtPrice) * 100),
        stock: x.stock,
      })),
      attributes: Object.fromEntries(v.attributes.map((a) => [a.key, a.value])),
      careInfo: v.careInfo || undefined,
      customization: { giftMessage: v.giftMessage, customPackaging: v.customPackaging, quoteOnRequest: v.quoteOnRequest },
      colour: v.colour || undefined,
      isFeatured: v.isFeatured,
      isNewArrival: v.isNewArrival,
      status: v.status,
      salesCount: product?.salesCount ?? 0,
      createdAt: product?.createdAt ?? new Date().toISOString(),
      seoTitle: v.seoTitle || undefined,
      seoDescription: v.seoDescription || undefined,
    };
    updateAdmin((d) => {
      const i = d.products.findIndex((p) => p.id === saved.id);
      if (i >= 0) d.products[i] = saved;
      else d.products.unshift(saved);
    });
    toast.success(product ? "Product saved" : "Product created");
    if (!product) router.replace(`/admin/products/${saved.id}`);
  });

  return (
    <form
      onSubmit={(ev) => {
        fillSkus();
        return onSubmit(ev);
      }}
      noValidate
    >
      <AdminHeader
        title={product ? product.name : "New product"}
        back={{ href: "/admin/products", label: "Products" }}
        actions={
          <>
            {product && (
              <ConfirmAction
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-danger">
                    <Trash2 /> Archive
                  </Button>
                }
                title="Archive this product?"
                description="Archived products are hidden from the store but kept for order history. You can restore them later."
                confirmLabel="Archive"
                destructive
                onConfirm={() => {
                  updateAdmin((d) => {
                    const p = d.products.find((x) => x.id === product.id);
                    if (p) p.status = "archived";
                  });
                  toast("Product archived");
                  router.push("/admin/products");
                }}
              />
            )}
            {product && product.status === "active" && (
              <Link href={`/products/${product.slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                View in store
              </Link>
            )}
            <Button type="submit" size="sm" loading={formState.isSubmitting}>
              {product ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      />

      {Object.keys(e).length > 0 && formState.isSubmitted && (
        <p role="alert" className="mb-6 rounded-control border-l-2 border-danger bg-danger/5 px-4 py-3 text-[0.88rem]">
          Please fix the highlighted fields before saving.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Product name" htmlFor="name" error={e.name?.message} className="sm:col-span-2">
                <Input
                  {...fieldAria("name", e.name?.message)}
                  {...register("name", {
                    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
                      if (slugManual) return;
                      const typed = ev.target.value;
                      setValue("slug", typed.trim() ? uniqueSlug(typed) : "", { shouldValidate: formState.isSubmitted });
                    },
                  })}
                />
              </Field>
              {editingSlug || e.slug ? (
                <Field
                  label="Web address"
                  htmlFor="slug"
                  error={e.slug?.message}
                  hint={`/products/${slugValue || "…"}`}
                  className="sm:col-span-2"
                >
                  <div className="flex gap-2">
                    <Input {...fieldAria("slug", e.slug?.message, true)} {...register("slug", { onChange: () => setSlugManual(true) })} />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 shrink-0"
                      onClick={() => {
                        setValue("slug", uniqueSlug(getValues("name")), { shouldValidate: true });
                        setSlugManual(Boolean(product));
                        setEditingSlug(false);
                      }}
                    >
                      Use name
                    </Button>
                  </div>
                </Field>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] sm:col-span-2">
                  <span className="text-muted">Web address</span>
                  <span className="min-w-0 break-all">/products/{slugValue || <span className="text-muted">made from the name</span>}</span>
                  <button
                    type="button"
                    onClick={() => setEditingSlug(true)}
                    className="inline-flex items-center gap-1 text-[0.8rem] text-muted underline underline-offset-4 hover:text-ink"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                </div>
              )}
              <Field
                label="Short description"
                htmlFor="shortDescription"
                error={e.shortDescription?.message}
                className="sm:col-span-2"
                hint="Shown near the price and on listings."
              >
                <Textarea
                  rows={2}
                  className="min-h-20"
                  {...fieldAria("shortDescription", e.shortDescription?.message, true)}
                  {...register("shortDescription")}
                />
              </Field>
              <Field
                label="Full description"
                htmlFor="description"
                error={e.description?.message}
                className="sm:col-span-2"
                hint="Separate paragraphs with a blank line."
              >
                <Textarea rows={6} {...fieldAria("description", e.description?.message, true)} {...register("description")} />
              </Field>
              <Field label="Care information" htmlFor="careInfo" optional className="sm:col-span-2">
                <Textarea rows={2} className="min-h-20" id="careInfo" {...register("careInfo")} />
              </Field>
            </div>
          </Panel>

          <Panel title="Images">
            {e.images?.message && <p className="mb-3 text-[0.8rem] text-danger">{e.images.message}</p>}
            <ImageDropzone multiple onFiles={uploads.addFiles} className="mb-4" />
            <div className="mb-4">
              <UploadQueue items={uploads.items} onRetry={uploads.retry} onDismiss={uploads.dismiss} />
            </div>
            {images.fields.length === 0 ? (
              <p className="text-[0.88rem] text-muted">No images yet. The first image is the main product photo.</p>
            ) : (
              <ul className="space-y-3">
                {images.fields.map((img, i) => (
                  <li key={img.id} className="flex items-start gap-4 rounded-control border border-line p-3">
                    <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-chip bg-surface">
                      <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Field
                        label={i === 0 ? "Alt text · main image" : "Alt text"}
                        htmlFor={`img-${i}`}
                        error={e.images?.[i]?.alt?.message}
                      >
                        <Input className="h-10" {...fieldAria(`img-${i}`, e.images?.[i]?.alt?.message)} {...register(`images.${i}.alt`)} />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={i === 0}
                        onClick={() => images.move(i, i - 1)}
                        aria-label="Move image up"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={i === images.fields.length - 1}
                        onClick={() => images.move(i, i + 1)}
                        aria-label="Move image down"
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-danger"
                        onClick={() => images.remove(i)}
                        aria-label="Remove image"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Price, options & stock">
            <fieldset>
              <legend className="mb-3 text-[0.9rem] font-medium">Does this product come in different versions?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {hasOptions && optionsHaveValues ? (
                  <ConfirmAction
                    trigger={<ChoiceCard pressed={false} icon={<Package />} title="One version" text="A single price and stock" />}
                    title="Switch to one version?"
                    description="The options and their versions are removed. The product keeps one price and stock."
                    confirmLabel="Use one version"
                    onConfirm={useOneVersion}
                  />
                ) : (
                  <ChoiceCard
                    pressed={!hasOptions}
                    onClick={useOneVersion}
                    icon={<Package />}
                    title="One version"
                    text="A single price and stock"
                  />
                )}
                <ChoiceCard
                  pressed={hasOptions}
                  onClick={() => !hasOptions && options.append({ name: "", values: "" })}
                  icon={<Layers />}
                  title="Different options"
                  text="Sizes, colours, packs — each with its own price and stock"
                />
              </div>
            </fieldset>

            {hasOptions && (
              <div className="mt-6 space-y-4">
                {options.fields.map((o, i) => {
                  const oe = e.options?.[i];
                  const optName = optionValues?.[i]?.name?.trim() ?? "";
                  const values = splitValues(optionValues?.[i]?.values ?? "");
                  const preset = OPTION_PRESETS.find((p) => p.name.toLowerCase() === optName.toLowerCase());
                  const usedNames = (optionValues ?? []).map((x) => x?.name?.trim().toLowerCase());
                  return (
                    <div key={o.id} className="rounded-card border border-line bg-canvas/50 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="eyebrow text-accent-ink">Option {i + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-danger"
                          onClick={() => removeOption(i)}
                          aria-label={`Remove option ${optName || i + 1}`}
                        >
                          <Trash2 /> Remove
                        </Button>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-[14rem_1fr]">
                        <div>
                          <label htmlFor={`opt-name-${i}`} className="mb-1.5 block text-[0.85rem] font-medium">
                            What varies?
                          </label>
                          <Input
                            id={`opt-name-${i}`}
                            placeholder="e.g. Colour"
                            aria-invalid={oe?.name ? true : undefined}
                            autoFocus={!o.name}
                            className={cn("h-11", oe?.name && "border-danger")}
                            {...register(`options.${i}.name`, {
                              onBlur: (ev: React.FocusEvent<HTMLInputElement>) => {
                                const v = ev.target.value.trim();
                                if (v) setValue(`options.${i}.name`, v.charAt(0).toUpperCase() + v.slice(1), { shouldValidate: true });
                                syncVariants(getValues("options"));
                              },
                            })}
                          />
                          {/* Quick picks while it's still unnamed. */}
                          <div className={cn("mt-2 flex flex-wrap gap-1.5", optName && "hidden")} aria-label="Quick picks">
                            {OPTION_PRESETS.filter((p) => !usedNames.includes(p.name.toLowerCase())).map((p) => (
                              <button
                                key={p.name}
                                type="button"
                                aria-pressed={p.name.toLowerCase() === optName.toLowerCase()}
                                // Keep focus in the name box so picking doesn't flag it as empty first.
                                onMouseDown={(ev) => ev.preventDefault()}
                                onClick={() => {
                                  setValue(`options.${i}.name`, p.name, { shouldDirty: true, shouldValidate: true });
                                  syncVariants(getValues("options"));
                                }}
                                className="rounded-full border border-line-strong px-2.5 py-1 text-[0.75rem] transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[0.85rem] font-medium">
                            {optName ? `${optName} choices` : "Choices"}{" "}
                            <span className="font-normal text-muted">— type one, press Enter</span>
                          </p>
                          <ValueChips
                            values={values}
                            onChange={(next) => setOptionValues(i, next)}
                            label={`${optName || `Option ${i + 1}`} choices`}
                            placeholder={`e.g. ${preset?.example ?? "Small, Medium, Large"}`}
                            invalid={Boolean(oe?.values)}
                          />
                          {values.length > 0 && (
                            <div className="mt-3 rounded-control bg-surface/70 px-3 py-2.5">
                              <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted">Customers will see</p>
                              <p className="mt-1.5 text-[0.85rem]">
                                <span className="font-medium">{optName || "Option"}:</span> <span className="text-muted">{values[0]}</span>
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5" aria-hidden>
                                {values.map((v, n) => (
                                  <span
                                    key={v}
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-[0.78rem]",
                                      n === 0 ? "border-ink bg-raised" : "border-line-strong",
                                    )}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {(oe?.name || oe?.values) && (
                        <p className="mt-3 text-[0.78rem] text-danger">
                          {oe?.name ? "Say what varies, e.g. Size or Colour." : "Add at least one choice, e.g. Small."}
                        </p>
                      )}
                    </div>
                  );
                })}
                {options.fields.length < 2 && (
                  <button
                    type="button"
                    onClick={() => options.append({ name: "", values: "" })}
                    className="flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong px-4 py-3 text-left transition-colors hover:border-ink hover:bg-surface/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface">
                      <Plus className="size-4" />
                    </span>
                    <span>
                      <span className="block text-[0.88rem] font-medium">Add another option</span>
                      <span className="block text-[0.78rem] text-muted">
                        e.g. Size as well as Colour — every combination gets its own price and stock
                      </span>
                    </span>
                  </button>
                )}
              </div>
            )}

            {e.variants?.message && <p className="mt-4 text-[0.8rem] text-danger">{e.variants.message}</p>}

            <div className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
                <h3 className="font-sans text-[0.95rem] font-medium">
                  {hasOptions ? "Price & stock for each version" : "Price & stock"}
                  {hasOptions && <span className="font-normal text-muted"> · {variants.fields.length}</span>}
                </h3>
                <label className="flex cursor-pointer items-center gap-2 text-[0.78rem] text-muted">
                  <input
                    type="checkbox"
                    checked={skuColumn}
                    disabled={skuErrors}
                    onChange={(ev) => setShowSkus(ev.target.checked)}
                    className="size-4 accent-[var(--brand)]"
                  />
                  Show SKU codes
                </label>
              </div>

              {variants.fields.length > 1 && (
                <div className="mt-4 flex flex-wrap items-end gap-2 rounded-control bg-surface/70 p-3">
                  <p className="w-full text-[0.8rem] font-medium sm:w-auto sm:self-center sm:pr-2">Set for all versions</p>
                  <label className="w-32">
                    <span className="sr-only">Selling price for all versions</span>
                    <MoneyInput
                      value={bulk.price}
                      onChange={(ev) => setBulk((b) => ({ ...b, price: ev.target.value }))}
                      placeholder="Price"
                    />
                  </label>
                  <label className="w-28">
                    <span className="sr-only">Stock for all versions</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={bulk.stock}
                      onChange={(ev) => setBulk((b) => ({ ...b, stock: ev.target.value }))}
                      placeholder="Stock"
                      className={cellClass()}
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10"
                    disabled={!bulk.price && !bulk.stock}
                    onClick={applyBulk}
                  >
                    Apply to all
                  </Button>
                </div>
              )}

              <div
                className={cn(
                  "mt-2 hidden gap-3 px-1 pt-2 text-[0.68rem] uppercase tracking-[0.12em] text-muted md:grid",
                  rowGrid(skuColumn, canRemoveRows, hasOptions),
                )}
              >
                {hasOptions && <span>Version</span>}
                <span>Selling price</span>
                <span>
                  Original price <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <span>In stock</span>
                {skuColumn && <span>SKU code</span>}
                {canRemoveRows && <span className="sr-only">Remove</span>}
              </div>
              <ul className="divide-y divide-line">
                {variants.fields.map((v, i) => {
                  const ve = e.variants?.[i];
                  const stock = Number(watchedVariants?.[i]?.stock ?? 0);
                  const parts = v.label === "Default" ? [] : v.label.split(" / ");
                  return (
                    <li
                      key={v.id}
                      className={cn("grid grid-cols-2 items-start gap-3 py-3 md:py-2.5", rowGrid(skuColumn, canRemoveRows, hasOptions))}
                    >
                      {hasOptions && (
                        <div className="col-span-2 flex min-h-10 items-center gap-1.5 md:col-span-1">
                          {parts.map((p) => (
                            <span key={p} className="rounded-full bg-surface px-2.5 py-1 text-[0.82rem] font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <CellField label="Selling price" error={ve?.price?.message}>
                        <MoneyInput
                          aria-label={`Selling price for ${v.label}`}
                          aria-invalid={!!ve?.price}
                          invalid={!!ve?.price}
                          {...register(`variants.${i}.price`)}
                        />
                      </CellField>
                      <CellField label="Original price" error={ve?.compareAtPrice?.message}>
                        <MoneyInput
                          aria-label={`Original price for ${v.label}`}
                          aria-invalid={!!ve?.compareAtPrice}
                          invalid={!!ve?.compareAtPrice}
                          placeholder="—"
                          {...register(`variants.${i}.compareAtPrice`)}
                        />
                      </CellField>
                      <CellField label="In stock" error={ve?.stock?.message}>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min={0}
                          aria-label={`Stock for ${v.label}`}
                          aria-invalid={!!ve?.stock}
                          className={cn(cellClass(ve?.stock?.message), stock === 0 && !ve?.stock && "border-[#d9a441] bg-[#fdf6e7]")}
                          {...register(`variants.${i}.stock`)}
                        />
                        {stock === 0 && !ve?.stock && <p className="mt-1 text-[0.72rem] text-[#8a5a00]">Out of stock</p>}
                      </CellField>
                      {skuColumn && (
                        <CellField label="SKU code" error={ve?.sku?.message} className="col-span-2 md:col-span-1">
                          <input
                            aria-label={`SKU for ${v.label}`}
                            aria-invalid={!!ve?.sku}
                            placeholder="Made automatically"
                            className={cn(cellClass(ve?.sku?.message), "uppercase placeholder:normal-case")}
                            {...register(`variants.${i}.sku`)}
                          />
                        </CellField>
                      )}
                      {canRemoveRows && (
                        <div className="col-span-2 flex justify-end md:col-span-1 md:block">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-10 text-danger"
                            onClick={() => removeVariant(v.label)}
                            aria-label={`Stop selling ${v.label}`}
                            title={`Stop selling ${v.label}`}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {outOfStock > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-control bg-[#fdf6e7] px-3 py-2.5 text-[0.8rem] text-[#6b4700]">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {outOfStock === variants.fields.length
                    ? "Customers can't buy this yet — add how many you have in stock."
                    : `${outOfStock} version${outOfStock > 1 ? "s show" : " shows"} as out of stock — add stock to sell ${outOfStock > 1 ? "them" : "it"}.`}
                </p>
              )}
              <p className="mt-3 text-[0.78rem] text-muted">
                Prices in rupees (paise allowed, e.g. 1.50). Original price shows crossed out next to the selling price, for a sale. Stock
                changes are recorded as manual adjustments.
              </p>
            </div>
          </Panel>

          <Panel
            title="Specifications"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => attributes.append({ key: "", value: "" })}>
                <Plus /> Add row
              </Button>
            }
          >
            {attributes.fields.length === 0 && <p className="text-[0.88rem] text-muted">Material, dimensions, contents…</p>}
            <div className="space-y-2">
              {attributes.fields.map((a, i) => (
                <div key={a.id} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
                  <Input
                    className="h-10"
                    placeholder="Label"
                    aria-label="Specification label"
                    aria-invalid={!!e.attributes?.[i]?.key}
                    {...register(`attributes.${i}.key`)}
                  />
                  <Input
                    className="h-10"
                    placeholder="Value"
                    aria-label="Specification value"
                    aria-invalid={!!e.attributes?.[i]?.value}
                    {...register(`attributes.${i}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-danger"
                    onClick={() => attributes.remove(i)}
                    aria-label="Remove specification"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Search engine listing">
            <div className="grid gap-5">
              <Field
                label="SEO title"
                htmlFor="seoTitle"
                optional
                error={e.seoTitle?.message}
                hint={`${(seoTitle ?? "").length}/70 · defaults to the product name`}
              >
                <Input {...fieldAria("seoTitle", e.seoTitle?.message, true)} {...register("seoTitle")} />
              </Field>
              <Field
                label="Meta description"
                htmlFor="seoDescription"
                optional
                error={e.seoDescription?.message}
                hint={`${(seoDescription ?? "").length}/160 · defaults to the short description`}
              >
                <Textarea
                  rows={3}
                  className="min-h-24"
                  {...fieldAria("seoDescription", e.seoDescription?.message, true)}
                  {...register("seoDescription")}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Visibility">
            <Field label="Status" htmlFor="status">
              <Select id="status" {...register("status")}>
                <option value="active">Active — visible in store</option>
                <option value="draft">Draft — hidden</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <div className="mt-5 space-y-4">
              <ControlledToggle
                control={control}
                name="isFeatured"
                label="Featured"
                description="Prioritised in Featured sorting"
                setValue={setValue}
              />
              <ControlledToggle
                control={control}
                name="isNewArrival"
                label="New arrival"
                description="Shown in New arrivals"
                setValue={setValue}
              />
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="space-y-5">
              <Field label="Category" htmlFor="categorySlug" error={e.categorySlug?.message}>
                <Select {...fieldAria("categorySlug", e.categorySlug?.message)} {...register("categorySlug")}>
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Colour (for filters)" htmlFor="colour" optional>
                <Input id="colour" placeholder="e.g. Blush" {...register("colour")} />
              </Field>
            </div>
          </Panel>

          <Panel title="Personalisation">
            <div className="space-y-4">
              <ControlledToggle
                control={control}
                name="giftMessage"
                label="Gift message"
                description="Customers can add a note"
                setValue={setValue}
              />
              <ControlledToggle control={control} name="customPackaging" label="Custom packaging" setValue={setValue} />
              <ControlledToggle
                control={control}
                name="quoteOnRequest"
                label="Quote on request"
                description="Links to the custom-order form"
                setValue={setValue}
              />
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}

type BoolField = "isFeatured" | "isNewArrival" | "giftMessage" | "customPackaging" | "quoteOnRequest";

function ControlledToggle({
  control,
  name,
  label,
  description,
  setValue,
}: {
  control: ReturnType<typeof useForm<Values, unknown, Parsed>>["control"];
  name: BoolField;
  label: string;
  description?: string;
  setValue: ReturnType<typeof useForm<Values, unknown, Parsed>>["setValue"];
}) {
  const value = useWatch({ control, name });
  return (
    <Toggle checked={Boolean(value)} onChange={(v) => setValue(name, v, { shouldDirty: true })} label={label} description={description} />
  );
}
