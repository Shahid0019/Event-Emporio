"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AdminHeader, ConfirmAction, DataTable, Panel, type Column } from "@/components/admin/admin-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { OptionPhotos, PhotoGalleryField } from "./image-upload";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { buildKit, NO_PREFS } from "@/lib/kit/buildKit";
import { activeKitFunctions } from "@/lib/kit/catalog";
import { CUSTOM_FUNCTION, kitCategories, tiers, type Occasion } from "@/lib/kit/config";
import { formatKitAmount, formatUnitPrice, quantityHint } from "@/lib/kit/format";
import {
  blankKitDraft,
  draftFromProduct,
  itemIdFor,
  kitIllustration,
  kitIllustrations,
  kitInfoOf,
  kitItemFromDraft,
  productFromDraft,
  validateKitDraft,
  type KitDraftErrors,
  type KitOptionDraft,
  type KitProductDraft,
} from "@/lib/kit/kit-product";
import { occasionName } from "@/lib/kit/url";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Product, ProductStatus } from "@/lib/types";
import { cn, rupeesToPaise } from "@/lib/utils";

const statusTone: Record<ProductStatus, "success" | "muted" | "danger"> = { active: "success", draft: "muted", archived: "danger" };
const sectionLabel = (id: string) => kitCategories.find((c) => c.id === id)?.label ?? id;
const perTramiLabel = (n: number) => (n >= 1 ? `${n} per trami` : `1 per ${Math.round(1 / n)} trami`);

function Thumb({ src, className }: { src?: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-[4/5] shrink-0 overflow-hidden rounded-chip bg-surface", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local SVG illustrations, no optimisation needed */}
      {src && <img src={src} alt="" className={cn("size-full object-cover", src.endsWith(".svg") && "scale-[1.12]")} />}
    </span>
  );
}

/* ================================ List =================================== */

export function KitProductsAdmin() {
  const { products } = adminStore.useStore();
  const kitProducts = products.filter((p) => kitInfoOf(p));
  const [section, setSection] = useState("all");
  const rows = kitProducts.filter((p) => section === "all" || kitInfoOf(p)?.category === section);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Kit product",
      sortValue: (p) => p.name,
      cell: (p) => (
        <Link href={`/admin/kit-products/${p.id}`} className="flex items-center gap-3 hover:text-brand">
          <Thumb src={p.images[0]?.src} className="w-9" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            <span className="text-[0.78rem] text-muted">{sectionLabel(kitInfoOf(p)!.category)}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "perTrami",
      header: "Per trami",
      sortValue: (p) => kitInfoOf(p)!.perTrami,
      cell: (p) => <span className="tabular-nums">{perTramiLabel(kitInfoOf(p)!.perTrami)}</span>,
    },
    {
      key: "occasions",
      header: "Functions",
      cell: (p) => {
        const o = kitInfoOf(p)!.occasions;
        return o ? o.map(occasionName).join(", ") : <span className="text-muted">All</span>;
      },
    },
    {
      key: "options",
      header: "Options",
      sortValue: (p) => Math.min(...p.variants.map((v) => v.price)),
      cell: (p) => {
        const prices = p.variants.map((v) => v.price);
        return (
          <span className="tabular-nums">
            {p.variants.length} · {formatUnitPrice(Math.min(...prices))}
            {prices.length > 1 && ` – ${formatUnitPrice(Math.max(...prices))}`}
          </span>
        );
      },
    },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <Badge tone={statusTone[p.status]}>{p.status}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (p) => (
        <Link
          href={`/admin/kit-products/${p.id}`}
          aria-label={`Edit ${p.name}`}
          className={buttonVariants({ variant: "ghost", size: "icon", className: "size-8" })}
        >
          <Pencil />
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Kit products"
        description={`${kitProducts.length} items the kit builder counts per trami · ${kitProducts.filter((p) => p.status === "active").length} active`}
        actions={
          <Link href="/admin/kit-products/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> Add kit product
          </Link>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        searchText={(p) => `${p.name} ${p.sku}`}
        searchPlaceholder="Search kit products…"
        empty="No kit products in this section."
        toolbar={
          <Select aria-label="Filter by kit section" value={section} onChange={(e) => setSection(e.target.value)} className="h-10 w-auto">
            <option value="all">All sections</option>
            {kitCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        }
      />
    </>
  );
}

/* =============================== Editor ================================== */

const noop = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export function KitProductEditorPage({ productId }: { productId?: string }) {
  const { products } = adminStore.useStore();
  const hydrated = useHydrated();
  const takenItemIds = products.flatMap((p) => kitInfoOf(p)?.itemId ?? []);
  if (!productId) return <KitProductEditor initial={blankKitDraft()} takenItemIds={takenItemIds} />;
  if (!hydrated) return <p className="text-muted">Loading…</p>;
  const product = products.find((p) => p.id === productId && kitInfoOf(p));
  if (!product) {
    return (
      <>
        <AdminHeader title="Kit product not found" back={{ href: "/admin/kit-products", label: "Kit products" }} />
        <p className="text-muted">It may have been deleted. Check Kit products for the current list.</p>
      </>
    );
  }
  return <KitProductEditor key={product.id} initial={draftFromProduct(product)} existing={product} takenItemIds={takenItemIds} />;
}

function KitProductEditor({ initial, existing, takenItemIds }: { initial: KitProductDraft; existing?: Product; takenItemIds: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  // What's on the server; anything different is an unsaved change.
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<KitDraftErrors>({});
  const isNew = !existing;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  // Closing or reloading the tab with unsaved edits (e.g. new photos) asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<KitProductDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateOption = (i: number, patch: Partial<KitOptionDraft>) =>
    setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const moveOption = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const options = [...d.options];
      [options[i], options[i + dir]] = [options[i + dir], options[i]];
      return { ...d, options };
    });

  const save = async () => {
    const found = validateKitDraft(draft, takenItemIds);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields");
      return;
    }
    const product = productFromDraft(draft, existing);
    setSaving(true);
    const ok = await updateAdmin((d) => {
      const i = d.products.findIndex((p) => p.id === product.id);
      if (i >= 0) d.products[i] = product;
      else d.products.unshift(product);
    });
    setSaving(false);
    if (!ok) return; // the reason is already shown
    setSaved(draft);
    toast.success(isNew ? "Kit product added" : "Kit product saved", { description: "Changes are live in the shop and kit builder." });
    if (isNew) router.replace(`/admin/kit-products/${product.id}`);
  };

  const occasionSet = draft.occasions;
  const functions = adminStore.useStore((d) => d.kitFunctions);
  const toggleOccasion = (o: Occasion) => {
    const current = occasionSet ?? [];
    update({ occasions: current.includes(o) ? current.filter((x) => x !== o) : [...current, o] });
  };

  return (
    <>
      <AdminHeader
        title={isNew ? "New kit product" : existing.name}
        description="Kit products are counted per trami by the kit builder. Everyday products live under Products."
        back={{ href: "/admin/kit-products", label: "Kit products" }}
        actions={
          <>
            {existing && existing.status !== "archived" && (
              <ConfirmAction
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-danger">
                    <Trash2 /> Archive
                  </Button>
                }
                title="Archive this kit product?"
                description="It leaves the kit builder and the store, but stays in past orders. You can set it back to Active later."
                confirmLabel="Archive"
                destructive
                onConfirm={() => {
                  updateAdmin((d) => {
                    const p = d.products.find((x) => x.id === existing.id);
                    if (p) p.status = "archived";
                  });
                  toast("Kit product archived");
                  router.push("/admin/kit-products");
                }}
              />
            )}
            <Button size="sm" onClick={save} loading={saving} variant={isNew || dirty ? "primary" : "outline"}>
              {isNew || dirty ? <Save /> : <Check />}
              {isNew ? "Add kit product" : dirty ? "Save" : "Saved"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Name"
                htmlFor="kp-name"
                error={errors.name}
                hint={isNew && draft.name ? `Kit id: ${itemIdFor(draft)}` : undefined}
              >
                <Input id="kp-name" value={draft.name} maxLength={60} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field label="Kit section" htmlFor="kp-section">
                <Select
                  id="kp-section"
                  value={draft.category}
                  onChange={(e) => update({ category: e.target.value as KitProductDraft["category"] })}
                >
                  {kitCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Needed per trami"
                htmlFor="kp-per"
                error={errors.perTrami}
                hint={draft.perTrami > 0 ? perTramiLabel(draft.perTrami) : undefined}
              >
                <Input
                  id="kp-per"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={draft.perTrami}
                  onChange={(e) => update({ perTrami: Number(e.target.value) })}
                />
              </Field>
              <Field label="Status" htmlFor="kp-status">
                <Select id="kp-status" value={draft.status} onChange={(e) => update({ status: e.target.value as ProductStatus })}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-[0.85rem] font-medium">
                Functions
                <Link
                  href="/admin/functions"
                  className="text-[0.78rem] font-normal text-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  Manage functions
                </Link>
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={occasionSet === null}
                  onClick={() => update({ occasions: occasionSet === null ? [] : null })}
                  className="min-h-10 rounded-full border border-line-strong px-4 text-[0.85rem] transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                >
                  All functions
                </button>
                {[...functions]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={occasionSet?.includes(o.id) ?? false}
                      disabled={occasionSet === null}
                      onClick={() => toggleOccasion(o.id)}
                      className="min-h-10 rounded-full border border-line-strong px-4 text-[0.85rem] transition-colors hover:border-ink disabled:opacity-40 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                    >
                      {o.name}
                      {!o.isActive && <span className="ml-1 text-[0.72rem] opacity-70">(hidden)</span>}
                    </button>
                  ))}
              </div>
              <p className="mt-2 text-[0.78rem] text-muted">
                &ldquo;All functions&rdquo; puts it in every kit. Otherwise only the picked functions suggest it — anyone can still add it
                by hand.
              </p>
              {errors.occasions && (
                <p role="alert" className="mt-1.5 text-[0.8rem] text-danger">
                  {errors.occasions}
                </p>
              )}
            </fieldset>
          </Panel>

          <Panel
            title="Options & prices"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDraft((d) => ({ ...d, options: [...d.options, { name: "", price: 0, stock: 20000 }] }))}
              >
                <Plus /> Add option
              </Button>
            }
          >
            <Field
              label="Choice label"
              htmlFor="kp-option-name"
              error={errors.optionName}
              hint="Shown above the options, e.g. Type, Size, Roll"
              className="max-w-xs"
            >
              <Input id="kp-option-name" value={draft.optionName} maxLength={20} onChange={(e) => update({ optionName: e.target.value })} />
            </Field>
            <p className="mt-5 text-[0.82rem] text-muted">
              Order matters: <strong className="font-medium text-ink">Basic</strong> starts on the first option,{" "}
              <strong className="font-medium text-ink">Standard</strong> on the second,{" "}
              <strong className="font-medium text-ink">Premium</strong> on the last. Options named “Bio”, “Printed” or “Customized” are
              picked by those preferences.
            </p>
            <p className="mt-2 text-[0.82rem] text-muted">
              Each option can have its own photos (up to 8) so shoppers see the difference, e.g. plastic vs wooden. Use “Add photos” under
              an option, or drop photos on it. Options without photos show the item’s photos.
            </p>
            <p
              aria-hidden
              className="mt-4 grid grid-cols-[1.5rem_minmax(0,1fr)_7rem_7rem_auto] gap-2 text-[0.72rem] uppercase tracking-[0.12em] text-muted"
            >
              <span />
              <span>Name</span>
              <span>Price</span>
              <span>Stock</span>
            </p>
            <ol className="mt-1 space-y-2">
              {draft.options.map((o, i) => (
                <li key={i} className="rounded-control border border-line p-2">
                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_7rem_7rem_auto] items-center gap-2">
                    <span className="text-center text-[0.8rem] tabular-nums text-muted">{i + 1}</span>

                    <Input
                      aria-label={`Option ${i + 1} name`}
                      placeholder="e.g. Plastic"
                      value={o.name}
                      maxLength={30}
                      onChange={(e) => updateOption(i, { name: e.target.value })}
                    />
                    <span className="relative">
                      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.85rem] text-muted">
                        ₹
                      </span>
                      <Input
                        aria-label={`Option ${i + 1} price in rupees`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7 tabular-nums"
                        value={o.price ? o.price / 100 : ""}
                        onChange={(e) => updateOption(i, { price: rupeesToPaise(Number(e.target.value)) })}
                      />
                    </span>
                    <Input
                      aria-label={`Option ${i + 1} stock`}
                      type="number"
                      min="0"
                      className="tabular-nums"
                      value={o.stock}
                      onChange={(e) => updateOption(i, { stock: Math.max(0, Math.round(Number(e.target.value))) })}
                    />
                    <span className="flex">
                      <IconBtn label={`Move option ${i + 1} up`} disabled={i === 0} onClick={() => moveOption(i, -1)}>
                        <ArrowUp />
                      </IconBtn>
                      <IconBtn
                        label={`Move option ${i + 1} down`}
                        disabled={i === draft.options.length - 1}
                        onClick={() => moveOption(i, 1)}
                      >
                        <ArrowDown />
                      </IconBtn>
                      <IconBtn
                        label={`Remove option ${i + 1}`}
                        disabled={draft.options.length === 1}
                        onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))}
                      >
                        <X />
                      </IconBtn>
                    </span>
                  </div>
                  <div className="mt-1.5 pl-8">
                    <OptionPhotos
                      label={`Photos for option ${i + 1}${o.name.trim() ? ` (${o.name.trim()})` : ""}`}
                      value={o.photos ?? []}
                      onChange={(photos) => updateOption(i, { photos })}
                      folder="kit-products"
                    />
                  </div>
                </li>
              ))}
            </ol>
            {errors.options && (
              <p role="alert" className="mt-2 text-[0.8rem] text-danger">
                {errors.options}
              </p>
            )}
          </Panel>
        </div>

        <aside className="h-fit space-y-6 xl:sticky xl:top-20">
          <Panel title="Photos">
            <PhotoGalleryField
              value={draft.photos}
              onChange={(photos) => update({ photos })}
              folder="kit-products"
              empty={
                <div className="rounded-control border border-line p-3">
                  <p className="text-[0.8rem] text-muted">No photos yet — this illustration is shown instead:</p>
                  <div className="mt-3 flex items-center gap-4">
                    <Thumb src={kitIllustration(draft.imageId, draft.name).src} className="w-16" />
                    <Field label="Illustration" htmlFor="kp-image" className="min-w-0 flex-1">
                      <Select id="kp-image" value={draft.imageId} onChange={(e) => update({ imageId: e.target.value })}>
                        {kitIllustrations.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              }
            />
            <p className="mt-3 text-[0.75rem] text-muted">Photos of the item in general. Shown in the kit, the shop and the cart.</p>
          </Panel>
          <KitPreview draft={draft} />
        </aside>
      </div>
      {dirty && !isNew && (
        <div
          role="status"
          className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/30 bg-raised/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgb(36_32_32/0.4)] backdrop-blur"
        >
          <p className="text-[0.88rem]">
            <span className="font-medium">Unsaved changes</span>
            <span className="text-muted"> — new photos and edits show in the shop only after you save.</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              <Save /> Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/** How the kit builder will treat this item, so staff can check the ratio and option order. */
function KitPreview({ draft }: { draft: KitProductDraft }) {
  const item = kitItemFromDraft(draft);
  const occasion: Occasion = draft.occasions?.[0] ?? activeKitFunctions()[0]?.id ?? CUSTOM_FUNCTION;
  const trami = 50;
  return (
    <Panel title="In a kit">
      <p className="text-[0.82rem] text-muted">
        {occasionName(occasion)} · {quantityHint(trami, item.perTrami, false)}
      </p>
      <ul className="mt-3 divide-y divide-line">
        {tiers.map((t) => {
          const line = buildKit({ occasion, trami, tier: t.id, prefs: NO_PREFS }, [item])[0];
          const option = line ? item.variants[line.variantIndex] : undefined;
          return (
            <li key={t.id} className="flex items-baseline justify-between gap-3 py-2 text-[0.85rem]">
              <span>
                <span className="block text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted">{t.name}</span>
                {option?.name || "—"} · {line?.qty ?? 0} pcs
              </span>
              <span className="font-medium tabular-nums">{line ? formatKitAmount(line.lineTotal) : "—"}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
