"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { sortOptions, type ListParams, type ListResult } from "@/lib/catalog-shared";
import { cn } from "@/lib/utils";

const priceBands = [
  { label: "Under ₹1,000", min: undefined, max: 999 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: undefined },
] as const;

export const swatches: Record<string, string> = {
  Blush: "#e8c4c0",
  Ivory: "#f3ece0",
  Gold: "#c5a46d",
  Lilac: "#c8b6d8",
  Brown: "#6b4a3a",
  Red: "#a3262a",
  Rust: "#b5603a",
  Multi: "conic-gradient(#e8c4c0, #c5a46d, #c8b6d8, #a3262a, #e8c4c0)",
};

type Patch = Partial<Record<"category" | "min" | "max" | "stock" | "colour" | "sort", string | string[] | undefined>>;

/** Builds the next URL from the current params, always resetting to page 1. */
function useCatalogNavigation(params: ListParams, lockedCategory?: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const navigate = (patch: Patch) => {
    const next = {
      q: params.q,
      category: lockedCategory ? undefined : params.category,
      min: params.min?.toString(),
      max: params.max?.toString(),
      stock: params.stock,
      colour: params.colour,
      sort: params.sort === "featured" ? undefined : params.sort,
      ...patch,
    };
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) continue;
      qs.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    const s = qs.toString();
    startTransition(() => router.push(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };

  return { navigate, pending };
}

interface FilterProps {
  params: ListParams;
  facets: ListResult["facets"];
  total: number;
  lockedCategory?: boolean;
}

export function CatalogToolbar(props: FilterProps) {
  const { params, total } = props;
  const { navigate, pending } = useCatalogNavigation(params, props.lockedCategory);
  const [open, setOpen] = useState(false);
  const activeCount = activeFilters(params, props.lockedCategory).length;

  return (
    <div className="flex items-center justify-between gap-4 border-y border-line py-3">
      <p className="text-[0.85rem] text-muted" aria-live="polite">
        {pending ? "Updating…" : `${total} ${total === 1 ? "product" : "products"}`}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.72rem] font-medium uppercase tracking-[0.14em] lg:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filter{" "}
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-brand text-[0.62rem] text-brand-ink">{activeCount}</span>
          )}
        </button>
        <label htmlFor="sort" className="sr-only">
          Sort products
        </label>
        <Select
          id="sort"
          value={params.sort}
          onChange={(e) => navigate({ sort: e.target.value === "featured" ? undefined : e.target.value })}
          className="h-11 w-auto min-w-[11rem] border-line-strong text-[0.85rem]"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Filter"
        side="bottom"
        footer={
          <Button className="w-full" onClick={() => setOpen(false)} loading={pending}>
            Show {total} {total === 1 ? "result" : "results"}
          </Button>
        }
      >
        <FilterFields key={`${params.min}-${params.max}`} {...props} navigate={navigate} idPrefix="m" />
      </Sheet>
    </div>
  );
}

export function FilterSidebar(props: FilterProps) {
  const { navigate } = useCatalogNavigation(props.params, props.lockedCategory);
  return (
    <aside aria-label="Product filters" className="hidden lg:block">
      <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
        <FilterFields key={`${props.params.min}-${props.params.max}`} {...props} navigate={navigate} idPrefix="d" />
      </div>
    </aside>
  );
}

function activeFilters(params: ListParams, lockedCategory?: boolean) {
  const chips: { key: string; label: string; patch: Patch }[] = [];
  if (params.category && !lockedCategory)
    chips.push({ key: "cat", label: params.category.replace(/-/g, " "), patch: { category: undefined } });
  if (params.min !== undefined || params.max !== undefined) {
    const label =
      params.min !== undefined && params.max !== undefined
        ? `₹${params.min}–₹${params.max}`
        : params.min !== undefined
          ? `From ₹${params.min}`
          : `Up to ₹${params.max}`;
    chips.push({ key: "price", label, patch: { min: undefined, max: undefined } });
  }
  if (params.stock) chips.push({ key: "stock", label: "In stock", patch: { stock: undefined } });
  params.colour?.forEach((c) => chips.push({ key: `c-${c}`, label: c, patch: { colour: params.colour!.filter((x) => x !== c) } }));
  return chips;
}

export function ActiveFilters({ params, lockedCategory }: { params: ListParams; lockedCategory?: boolean }) {
  const { navigate } = useCatalogNavigation(params, lockedCategory);
  const chips = activeFilters(params, lockedCategory);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => navigate(chip.patch)}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[0.8rem] capitalize transition-colors hover:bg-accent-soft"
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => navigate({ category: undefined, min: undefined, max: undefined, stock: undefined, colour: undefined })}
        className="ml-1 text-[0.75rem] uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}

function FilterFields({
  params,
  facets,
  lockedCategory,
  navigate,
  idPrefix,
}: FilterProps & { navigate: (patch: Patch) => void; idPrefix: string }) {
  const [min, setMin] = useState(params.min?.toString() ?? "");
  const [max, setMax] = useState(params.max?.toString() ?? "");

  return (
    <div className="space-y-9">
      {!lockedCategory && facets.categories.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-4 text-ink">Category</legend>
          <ul className="space-y-1">
            <li>
              <FilterOption active={!params.category} onClick={() => navigate({ category: undefined })} label="All" />
            </li>
            {facets.categories.map((c) => (
              <li key={c.slug}>
                <FilterOption
                  active={params.category === c.slug}
                  onClick={() => navigate({ category: c.slug })}
                  label={c.name}
                  count={c.count}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-4 text-ink">Price</legend>
        <ul className="space-y-1">
          {priceBands.map((band) => {
            const active = params.min === band.min && params.max === band.max;
            return (
              <li key={band.label}>
                <FilterOption
                  active={active}
                  onClick={() => {
                    setMin(band.min?.toString() ?? "");
                    setMax(band.max?.toString() ?? "");
                    navigate(active ? { min: undefined, max: undefined } : { min: band.min?.toString(), max: band.max?.toString() });
                  }}
                  label={band.label}
                />
              </li>
            );
          })}
        </ul>
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const lo = min ? Math.max(0, Math.floor(+min)) : undefined;
            const hi = max ? Math.max(0, Math.floor(+max)) : undefined;
            const [a, b] = lo !== undefined && hi !== undefined && lo > hi ? [hi, lo] : [lo, hi];
            navigate({ min: a?.toString(), max: b?.toString() });
          }}
        >
          <PriceInput id={`${idPrefix}-min`} label="Min ₹" value={min} onChange={setMin} />
          <PriceInput id={`${idPrefix}-max`} label="Max ₹" value={max} onChange={setMax} />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-full border border-ink px-3.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] hover:bg-ink hover:text-canvas"
          >
            Go
          </button>
        </form>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4 text-ink">Availability</legend>
        <label className="flex cursor-pointer items-center gap-3 text-[0.9rem]">
          <input
            type="checkbox"
            checked={params.stock === "in"}
            onChange={(e) => navigate({ stock: e.target.checked ? "in" : undefined })}
            className="size-4 accent-[var(--brand)]"
          />
          In stock only
        </label>
      </fieldset>

      {facets.colours.length > 1 && (
        <fieldset>
          <legend className="eyebrow mb-4 text-ink">Colour</legend>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {facets.colours.map((c) => {
              const checked = params.colour?.includes(c.value) ?? false;
              return (
                <li key={c.value}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[0.88rem]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() =>
                        navigate({
                          colour: checked ? params.colour?.filter((x) => x !== c.value) : [...(params.colour ?? []), c.value],
                        })
                      }
                    />
                    <span
                      aria-hidden
                      className="size-5 shrink-0 rounded-full border border-line-strong ring-offset-2 ring-offset-canvas peer-checked:ring-1 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-brand"
                      style={{ background: swatches[c.value] ?? "#ddd" }}
                    />
                    <span className={cn(checked && "font-medium")}>
                      {c.value} <span className="text-muted">({c.count})</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </div>
  );
}

function FilterOption({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between py-1.5 text-left text-[0.92rem] transition-colors hover:text-brand",
        active ? "font-medium text-brand" : "text-ink",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span aria-hidden className={cn("size-1.5 rounded-full transition-colors", active ? "bg-brand" : "bg-line-strong")} />
        {label}
      </span>
      {count !== undefined && <span className="text-[0.8rem] text-muted">{count}</span>}
    </button>
  );
}

function PriceInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-[0.72rem] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-control border border-line-strong bg-raised px-3 text-sm focus:border-ink focus:outline-none"
      />
    </div>
  );
}
