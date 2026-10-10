"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Wand2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { DemoNote, EmptyState } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { demoImage, type DemoImageName } from "@/lib/data/images";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Product } from "@/lib/types";
import { cn, slugify, newId } from "@/lib/utils";
import { productFormSchema } from "@/lib/validations";
import { AdminHeader, ConfirmAction, Panel, Toggle } from "./admin-ui";

type Values = z.input<typeof productFormSchema>;
type Parsed = z.output<typeof productFormSchema>;

const library: DemoImageName[] = [
  "rose-basket",
  "lilac-basket",
  "mehndi-celebration",
  "mehndi-hands",
  "mehndi-rings",
  "gift-candlelight",
  "gift-kraft",
  "gift-boxes-white",
  "gift-gold-ribbon",
  "gift-pink",
  "gift-red",
  "hamper-newborn",
  "chocolates-assorted",
  "chocolates-teal",
  "macaron-box",
  "macarons-stack",
  "dry-fruits-brass",
  "brass-tray",
  "brass-pitcher",
  "candle-jar",
  "candles-diffuser",
  "florals-vase",
  "roses-pink",
  "table-setting",
  "dinner-table",
  "candlelit-table",
];

function toValues(p?: Product): Values {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    sku: p?.sku ?? "",
    shortDescription: p?.shortDescription ?? "",
    description: p?.description.join("\n\n") ?? "",
    categorySlug: p?.categorySlug ?? "",
    collectionSlugs: p?.collectionSlugs ?? [],
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
  const { products, categories, collections } = adminStore.useStore();
  const existing = productId ? products.find((p) => p.id === productId) : undefined;
  if (productId && !existing) {
    return (
      <EmptyState
        title="Product not found"
        description="It may have been deleted from the demo data."
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
      collections={collections}
      allSkus={products.filter((p) => p.id !== existing?.id).flatMap((p) => p.variants.map((v) => v.sku.toUpperCase()))}
    />
  );
}

function EditorForm({
  product,
  categories,
  collections,
  allSkus,
}: {
  product?: Product;
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  allSkus: string[];
}) {
  const router = useRouter();
  const [picker, setPicker] = useState(false);
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toValues(product),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, getValues, formState, setError } = form;
  const e = formState.errors;
  const images = useFieldArray({ control, name: "images" });
  const variants = useFieldArray({ control, name: "variants" });
  const options = useFieldArray({ control, name: "options" });
  const attributes = useFieldArray({ control, name: "attributes" });
  const [seoTitle, seoDescription, name, slugValue] = useWatch({ control, name: ["seoTitle", "seoDescription", "name", "slug"] });

  /** Builds the variant matrix from the option values, keeping prices/stock of matching rows. */
  const generateVariants = () => {
    const opts = getValues("options")
      .map((o) => ({
        name: o.name.trim(),
        values: o.values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length);
    const base = getValues("sku") || "SKU";
    const existing = getValues("variants");
    let combos: Record<string, string>[] = [{}];
    for (const o of opts) combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
    variants.replace(
      combos.map((combo, i) => {
        const label = Object.values(combo).join(" / ") || "Default";
        const match = existing.find((v) => v.label === label);
        return (
          match ?? {
            id: newId("v"),
            sku: `${base}-${String(i + 1).padStart(2, "0")}`,
            label,
            options: combo,
            price: existing[0]?.price ?? "",
            compareAtPrice: "",
            stock: 0,
          }
        );
      }),
    );
    toast(`${combos.length} variant${combos.length === 1 ? "" : "s"} generated`);
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
      setError("slug", { message: "Another product already uses this slug" });
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
      collectionSlugs: v.collectionSlugs,
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
    <form onSubmit={onSubmit} noValidate>
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
                    onBlur: (ev: React.FocusEvent<HTMLInputElement>) => {
                      if (!getValues("slug")) setValue("slug", slugify(ev.target.value), { shouldValidate: true });
                    },
                  })}
                />
              </Field>
              <Field label="URL slug" htmlFor="slug" error={e.slug?.message} hint={`/products/${slugValue || "…"}`}>
                <div className="flex gap-2">
                  <Input {...fieldAria("slug", e.slug?.message, true)} {...register("slug")} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-12 shrink-0"
                    aria-label="Generate slug from name"
                    onClick={() => setValue("slug", slugify(name), { shouldValidate: true })}
                  >
                    <Wand2 />
                  </Button>
                </div>
              </Field>
              <Field label="Base SKU" htmlFor="sku" error={e.sku?.message}>
                <Input className="uppercase" {...fieldAria("sku", e.sku?.message)} {...register("sku")} />
              </Field>
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

          <Panel
            title="Images"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setPicker(true)}>
                <ImagePlus /> Add image
              </Button>
            }
          >
            {e.images?.message && <p className="mb-3 text-[0.8rem] text-danger">{e.images.message}</p>}
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
            <DemoNote className="mt-4">
              File uploads go to Cloudinary/S3 with type and size validation once the backend is connected. In demo mode, pick from the
              placeholder library.
            </DemoNote>
          </Panel>

          <Panel title="Options & variants">
            <div className="space-y-3">
              {options.fields.map((o, i) => (
                <div key={o.id} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
                  <Input
                    placeholder="Option (e.g. Size)"
                    aria-label={`Option ${i + 1} name`}
                    className="h-10"
                    {...register(`options.${i}.name`)}
                  />
                  <Input
                    placeholder="Values, comma separated (e.g. Small, Medium)"
                    aria-label={`Option ${i + 1} values`}
                    className="h-10"
                    {...register(`options.${i}.values`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-danger"
                    onClick={() => options.remove(i)}
                    aria-label="Remove option"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {options.fields.length < 2 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => options.append({ name: "", values: "" })}>
                    <Plus /> Add option
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={generateVariants}>
                  <Wand2 /> Generate variants
                </Button>
              </div>
            </div>

            {e.variants?.message && <p className="mt-4 text-[0.8rem] text-danger">{e.variants.message}</p>}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-[0.85rem]">
                <thead>
                  <tr className="border-b border-line text-left text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                    <th className="py-2 pr-3 font-medium">Variant</th>
                    <th className="py-2 pr-3 font-medium">SKU</th>
                    <th className="py-2 pr-3 font-medium">Price ₹</th>
                    <th className="py-2 pr-3 font-medium">Compare at ₹</th>
                    <th className="py-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.fields.map((v, i) => {
                    const ve = e.variants?.[i];
                    const cell = (err?: string) =>
                      cn(
                        "h-9 w-full rounded-chip border bg-canvas px-2.5 text-sm focus:border-ink focus:outline-none",
                        err ? "border-danger" : "border-line-strong",
                      );
                    return (
                      <tr key={v.id} className="border-b border-line align-top">
                        <td className="py-2 pr-3 pt-4 font-medium">{v.label}</td>
                        <td className="py-2 pr-3">
                          <input
                            aria-label={`SKU for ${v.label}`}
                            aria-invalid={!!ve?.sku}
                            className={cn(cell(ve?.sku?.message), "uppercase")}
                            {...register(`variants.${i}.sku`)}
                          />
                          {ve?.sku && <p className="mt-1 text-[0.72rem] text-danger">{ve.sku.message}</p>}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="1"
                            min={0}
                            aria-label={`Price for ${v.label}`}
                            aria-invalid={!!ve?.price}
                            className={cell(ve?.price?.message)}
                            {...register(`variants.${i}.price`)}
                          />
                          {ve?.price && <p className="mt-1 text-[0.72rem] text-danger">{ve.price.message}</p>}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="1"
                            min={0}
                            aria-label={`Compare-at price for ${v.label}`}
                            aria-invalid={!!ve?.compareAtPrice}
                            className={cell(ve?.compareAtPrice?.message)}
                            {...register(`variants.${i}.compareAtPrice`)}
                          />
                          {ve?.compareAtPrice && <p className="mt-1 text-[0.72rem] text-danger">{ve.compareAtPrice.message}</p>}
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min={0}
                            aria-label={`Stock for ${v.label}`}
                            aria-invalid={!!ve?.stock}
                            className={cell(ve?.stock?.message)}
                            {...register(`variants.${i}.stock`)}
                          />
                          {ve?.stock && <p className="mt-1 text-[0.72rem] text-danger">{ve.stock.message}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[0.78rem] text-muted">
              Prices are entered in rupees and stored as integer paise. Stock changes here are recorded as manual adjustments.
            </p>
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
              <fieldset>
                <legend className="mb-2 text-[0.8rem] font-medium">Collections</legend>
                <div className="space-y-2">
                  {collections.map((c) => (
                    <label key={c.slug} className="flex items-center gap-2.5 text-[0.88rem]">
                      <input type="checkbox" value={c.slug} className="size-4 accent-[var(--brand)]" {...register("collectionSlugs")} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
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

      <Sheet open={picker} onOpenChange={setPicker} title="Image library" description="Demo placeholder images" side="right">
        <ul className="grid grid-cols-3 gap-2">
          {library.map((name) => {
            const img = demoImage(name, name.replace(/-/g, " "));
            return (
              <li key={name}>
                <button
                  type="button"
                  className="relative block aspect-square w-full overflow-hidden rounded-control bg-surface ring-ink hover:ring-1 focus-visible:ring-2"
                  onClick={() => {
                    images.append({ ...img, alt: "" });
                    setPicker(false);
                    toast("Image added — remember to write alt text");
                  }}
                  aria-label={`Add ${img.alt}`}
                >
                  <Image src={img.src} alt="" fill sizes="120px" className="object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
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
